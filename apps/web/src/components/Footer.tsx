export function Footer() {
  return (
    <footer className="border-t border-nav-border bg-nav-bg">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-6">
        <p className="text-sm text-header-text-muted">
          &copy; {new Date().getFullYear()} BrickBase. Real Estate investment through digital asset tokenisation.
        </p>
      </div>
    </footer>
  );
}
