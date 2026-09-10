/** The quiet "keep going" mark at the bottom of the hero. */
export function ScrollCue() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center">
      <span className="font-body text-caption text-forest/75">scroll</span>
    </div>
  );
}
