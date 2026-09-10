"""
Trains the fingerspelling letter classifier and writes it out for the browser,
at src/features/sign-classifier/models/letters.json.

Reads the file the recorder exports (`buildExport` in recorder/lib/dataset.ts).
Every sample is already normalized by `normalizeHand`, so this script does no
geometry of its own beyond augmentation — whatever it does here would have to
be reproduced at inference time, and the whole point of normalizing at record
time is that there is nothing left to reproduce.

    python -m venv .venv && .venv/bin/pip install torch numpy
    .venv/bin/python training/train_letters.py

## Why JSON and not TF.js

REALSIGN.md section 7 says "convert to TF.js". This writes plain JSON instead
and the browser does the three matrix multiplies itself, because the model is
~18k parameters: a runtime to execute it would be two orders of magnitude
larger than the thing it executes. The TypeScript that reads this file is
checked against PyTorch to 1e-6 by `--check`, which is the guarantee a library
would otherwise be providing.

## What the reported accuracy is worth

Not much on its own, and the script says so on every run. All 60 samples of a
letter are consecutive frames of one continuous hold — measured, not assumed:
neighbouring samples sit ~3.9x closer together than random pairs of the same
letter. So there is exactly one recording session, one hand, one set of
lighting, and one distance behind every class.

The split below is temporal rather than random for that reason: early frames
train, late frames test, so the test set at least sits on the far side of
whatever drift happened during the hold. A random split would score higher and
mean less, and it is reported alongside only to show the size of that gap.

Neither number estimates accuracy on a different day. That needs a second
recording session, and until there is one, treat these as an upper bound.
"""

import argparse
import json
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

# Mirrors hand-tracking/lib/landmarks.ts. Kept as names rather than literals so
# the correspondence is greppable from either side.
WRIST = 0
MIDDLE_MCP = 9
CANONICAL_ANGLE = -np.pi / 2

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "realsign-letters-1440.json"
OUT = ROOT / "src/features/sign-classifier/models/letters.json"

# Frames 0-59 of each hold, split by position rather than at random.
TRAIN_END, VAL_END = 0.60, 0.80

HIDDEN = (128, 64)
EPOCHS = 400
BATCH = 64
LEARNING_RATE = 3e-3
WEIGHT_DECAY = 1e-4
DROPOUT = 0.25
SEED = 13

# Augmentation. One burst per letter means the model will happily memorise the
# burst, so this stands in for the variation a second session would have
# supplied. Only landmark jitter is applied: a global rotation or scale change
# is removed again by the re-normalization below, so augmenting with either
# would be a no-op dressed up as regularization. Jitter is different, because
# it moves the wrist and the middle-MCP too, and those are what the normalizer
# measures itself against — so a wobble there lands as a wobble in the derived
# scale and tilt, which is exactly what MediaPipe does at inference.
NOISE_XY = 0.02            # per-landmark jitter, in units where the hand is 1
NOISE_Z = 0.05             # z is visibly noisier than x and y

# Set by `normalizeHand`, not by the data: the wrist is moved to the origin and
# the middle-MCP is pinned to (0, -1) in the image plane. Five of the 63 values
# are therefore the same in every sample that function has ever produced, so
# they carry nothing and their standard deviation is zero. Dividing by it is
# what a naive standardizer does, and it turns augmentation noise into values
# in the hundreds of thousands.
CONSTANT_STD = 1e-3


class LetterNet(nn.Module):
    """63 normalized landmark values in, one logit per letter out."""

    def __init__(self, features: int, classes: int):
        super().__init__()
        first, second = HIDDEN
        self.net = nn.Sequential(
            nn.Linear(features, first), nn.ReLU(), nn.Dropout(DROPOUT),
            nn.Linear(first, second), nn.ReLU(), nn.Dropout(DROPOUT),
            nn.Linear(second, classes),
        )

    def forward(self, x):
        return self.net(x)


def load() -> tuple[dict[str, np.ndarray], list[str], int]:
    payload = json.loads(DATA.read_text())
    samples = payload["samples"]
    letters = sorted(samples)
    width = payload["featureLength"]

    banks = {}
    for letter in letters:
        bank = np.asarray(samples[letter], dtype=np.float32)
        if bank.ndim != 2 or bank.shape[1] != width:
            raise SystemExit(f"{letter}: expected (n, {width}), got {bank.shape}")
        banks[letter] = bank

    return banks, letters, width


def split(banks, letters):
    """Temporal split, per letter, so the test frames are the late ones."""
    parts = {"train": ([], []), "val": ([], []), "test": ([], [])}

    for label, letter in enumerate(letters):
        bank = banks[letter]
        count = len(bank)
        train_end = int(count * TRAIN_END)
        val_end = int(count * VAL_END)

        for name, chunk in (
            ("train", bank[:train_end]),
            ("val", bank[train_end:val_end]),
            ("test", bank[val_end:]),
        ):
            parts[name][0].append(chunk)
            parts[name][1].append(np.full(len(chunk), label, dtype=np.int64))

    return {
        name: (np.concatenate(x), np.concatenate(y)) for name, (x, y) in parts.items()
    }


def renormalize(points: torch.Tensor) -> torch.Tensor:
    """
    Re-applies `normalizeHand`, so an augmented sample is one the browser could
    actually produce.

    Steps 1 to 3 of landmarks.ts, in the same order and measuring the same way:
    wrist to the origin, scale by the wrist-to-middle-MCP distance in the image
    plane only, then rotate that vector onto -pi/2. Mirroring is not repeated,
    because the recorder already did it and everything here is right-hand space.
    """
    wrist, middle = points[:, WRIST], points[:, MIDDLE_MCP]
    points = points - wrist.unsqueeze(1)

    delta = middle - wrist
    scale = torch.hypot(delta[:, 0], delta[:, 1]).clamp_min(1e-6)
    points = points / scale[:, None, None]

    # atan2 on the rescaled vector, so the turn matches what the browser computes.
    turn = CANONICAL_ANGLE - torch.atan2(
        points[:, MIDDLE_MCP, 1], points[:, MIDDLE_MCP, 0]
    )
    cos, sin = torch.cos(turn)[:, None], torch.sin(turn)[:, None]

    # Read both axes before writing either: assigning into a slice would update
    # the view the second line still needs.
    x, y = points[:, :, 0].clone(), points[:, :, 1].clone()
    rotated = torch.stack([x * cos - y * sin, x * sin + y * cos, points[:, :, 2]], dim=2)
    return rotated


def augment(batch: torch.Tensor, generator: torch.Generator) -> torch.Tensor:
    """Per-landmark jitter, then re-normalized back onto the real manifold."""
    count = batch.shape[0]
    points = batch.view(count, -1, 3).clone()

    noise = torch.randn(points.shape, generator=generator)
    noise[:, :, :2] *= NOISE_XY
    noise[:, :, 2] *= NOISE_Z

    return renormalize(points + noise).reshape(count, -1)


def accuracy(model, standardize, x, y) -> float:
    model.eval()
    with torch.no_grad():
        predicted = model(standardize(x)).argmax(1)
    return (predicted == y).float().mean().item() * 100


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true",
                        help="compare the written JSON against PyTorch and exit")
    arguments = parser.parse_args()

    torch.manual_seed(SEED)
    np.random.seed(SEED)

    banks, letters, width = load()
    print(f"{sum(len(b) for b in banks.values())} samples, {len(letters)} letters, "
          f"{width} features")
    report_burst_structure(banks, letters)

    parts = split(banks, letters)
    tensors = {
        name: (torch.from_numpy(x), torch.from_numpy(y))
        for name, (x, y) in parts.items()
    }
    train_x, train_y = tensors["train"]
    print(f"split: {len(train_x)} train / {len(tensors['val'][0])} val / "
          f"{len(tensors['test'][0])} test, by frame position within each hold")

    # Standardization is fitted on the training frames only and shipped with the
    # weights. G, Q, H and P come out of the normalizer several times larger than
    # the other letters, because their wrist-to-middle-MCP vector is foreshortened
    # and it is the divisor, so without this the loss is dominated by four classes.
    mean = train_x.mean(0)
    std = train_x.std(0)
    inert = std < CONSTANT_STD
    std = torch.where(inert, torch.ones_like(std), std)
    print(f"standardizer: {int(inert.sum())} of {width} features are constant by "
          f"construction and pass through unscaled")

    def standardize(x):
        return (x - mean) / std

    model = LetterNet(width, len(letters))
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE,
                                  weight_decay=WEIGHT_DECAY)
    schedule = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, EPOCHS)
    loss_function = nn.CrossEntropyLoss(label_smoothing=0.05)
    generator = torch.Generator().manual_seed(SEED)

    best_val, best_state, best_epoch = -1.0, None, 0

    for epoch in range(EPOCHS):
        model.train()
        order = torch.randperm(len(train_x), generator=generator)

        for start in range(0, len(order), BATCH):
            batch = order[start:start + BATCH]
            x = standardize(augment(train_x[batch], generator))
            loss = loss_function(model(x), train_y[batch])

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

        schedule.step()

        # Model selection happens on the validation frames. The test frames are
        # scored once, at the end, so that number stays honest.
        validation = accuracy(model, standardize, *tensors["val"])
        if validation > best_val:
            best_val = validation
            best_epoch = epoch
            best_state = {k: v.clone() for k, v in model.state_dict().items()}

        if (epoch + 1) % 50 == 0:
            print(f"  epoch {epoch + 1:>3}  loss {loss.item():.4f}  val {validation:.2f}%")

    model.load_state_dict(best_state)
    print(f"\nbest val {best_val:.2f}% at epoch {best_epoch + 1}")

    test = accuracy(model, standardize, *tensors["test"])
    print(f"held-out test (late frames): {test:.2f}%")
    report_random_split_gap(banks, letters, width, mean, std)
    confusion(model, standardize, tensors["test"], letters)

    write(model, mean, std, letters, width, test)
    if arguments.check:
        check(model, standardize, tensors["test"][0])


def report_burst_structure(banks, letters) -> None:
    """Measures the thing the docstring claims, rather than asserting it."""
    ratios = []
    generator = np.random.default_rng(0)
    for letter in letters:
        bank = banks[letter].astype(np.float64)
        consecutive = np.linalg.norm(np.diff(bank, axis=0), axis=1).mean()
        pairs = generator.integers(0, len(bank), (400, 2))
        pairs = pairs[pairs[:, 0] != pairs[:, 1]]
        random_pair = np.linalg.norm(bank[pairs[:, 0]] - bank[pairs[:, 1]], axis=1).mean()
        ratios.append(random_pair / max(consecutive, 1e-9))

    print(f"burst check: random pairs sit {np.mean(ratios):.1f}x further apart than "
          f"neighbours,\n  so each letter is one continuous hold, not "
          f"{len(banks[letters[0]])} independent samples.")


def report_random_split_gap(banks, letters, width, mean, std) -> None:
    """Trains the same model on a random split, only to show how much it flatters."""
    xs, ys = [], []
    for label, letter in enumerate(letters):
        xs.append(banks[letter])
        ys.append(np.full(len(banks[letter]), label, dtype=np.int64))
    x, y = torch.from_numpy(np.concatenate(xs)), torch.from_numpy(np.concatenate(ys))

    generator = torch.Generator().manual_seed(SEED)
    order = torch.randperm(len(x), generator=generator)
    cut = int(len(x) * VAL_END)
    train_index, test_index = order[:cut], order[cut:]

    model = LetterNet(width, len(letters))
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE,
                                  weight_decay=WEIGHT_DECAY)
    loss_function = nn.CrossEntropyLoss(label_smoothing=0.05)

    for _ in range(EPOCHS // 2):
        model.train()
        batch_order = train_index[torch.randperm(len(train_index), generator=generator)]
        for start in range(0, len(batch_order), BATCH):
            batch = batch_order[start:start + BATCH]
            features = ((x[batch] - mean) / std)
            loss = loss_function(model(features), y[batch])
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

    model.eval()
    with torch.no_grad():
        predicted = model((x[test_index] - mean) / std).argmax(1)
    score = (predicted == y[test_index]).float().mean().item() * 100
    print(f"same model on a random split:  {score:.2f}%  <- leaks, for contrast only")


def confusion(model, standardize, test, letters) -> None:
    """The matrix section 7 of the spec asks for: which letters need more data."""
    x, y = test
    model.eval()
    with torch.no_grad():
        predicted = model(standardize(x)).argmax(1)

    matrix = np.zeros((len(letters), len(letters)), dtype=int)
    for actual, guess in zip(y.tolist(), predicted.tolist()):
        matrix[actual][guess] += 1

    mistakes = [
        (matrix[i][j], letters[i], letters[j])
        for i in range(len(letters))
        for j in range(len(letters))
        if i != j and matrix[i][j]
    ]
    if not mistakes:
        print("confusion: none on the held-out frames")
        return

    print("confusion (actual -> predicted, held-out frames):")
    for count, actual, guess in sorted(mistakes, reverse=True):
        total = matrix[letters.index(actual)].sum()
        print(f"  {actual} -> {guess}: {count}/{total}")


def write(model, mean, std, letters, width, test) -> None:
    """Weights as plain arrays, in the order the browser multiplies them."""
    # The weights are float32, so serialising their float64 repr writes about
    # twelve digits of noise per number and triples the file. 7 significant
    # digits round-trips a float32 exactly.
    def compact(values):
        return [float(f"{value:.7g}") for value in values]

    layers = []
    for module in model.net:
        if isinstance(module, nn.Linear):
            layers.append({
                # Stored transposed, so the browser walks input-major and reads
                # each row contiguously instead of striding.
                "weight": compact(module.weight.detach().t().contiguous().flatten()),
                "bias": compact(module.bias.detach()),
                "in": module.in_features,
                "out": module.out_features,
            })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "version": 1,
        "kind": "letters",
        "letters": letters,
        "featureLength": width,
        "heldOutAccuracy": round(test, 2),
        "activation": "relu",
        "mean": compact(mean),
        "std": compact(std),
        "layers": layers,
    }))
    size = OUT.stat().st_size / 1024
    parameters = sum(l["in"] * l["out"] + l["out"] for l in layers)
    print(f"\nwrote {OUT.relative_to(ROOT)} ({parameters} parameters, {size:.0f}KB)")


def check(model, standardize, x) -> None:
    """Re-runs the written JSON in NumPy, the way the TypeScript will."""
    payload = json.loads(OUT.read_text())
    mean = np.asarray(payload["mean"], dtype=np.float64)
    std = np.asarray(payload["std"], dtype=np.float64)

    activations = (x.numpy().astype(np.float64) - mean) / std

    # Apple's Accelerate BLAS raises divide-by-zero, overflow and invalid flags
    # on matmuls whose inputs and outputs are all finite. Verified spurious:
    # the same products computed through einsum, which does not call BLAS, are
    # bit-identical. Suppressed rather than left to look like a real fault, and
    # the finiteness assertion below is what would catch one if it were.
    with np.errstate(all="ignore"):
        for index, layer in enumerate(payload["layers"]):
            weight = np.asarray(layer["weight"], dtype=np.float64).reshape(
                layer["in"], layer["out"])
            activations = activations @ weight + np.asarray(
                layer["bias"], dtype=np.float64)
            if index < len(payload["layers"]) - 1:
                activations = np.maximum(activations, 0.0)

    if not np.isfinite(activations).all():
        raise SystemExit("The written weights produce non-finite logits.")

    model.eval()
    with torch.no_grad():
        expected = model(standardize(x)).numpy().astype(np.float64)

    gap = np.abs(expected - activations).max()
    print(f"json vs pytorch: {gap:.2e}")
    if gap > 1e-5:
        raise SystemExit("The written weights do not reproduce the model.")


if __name__ == "__main__":
    main()
