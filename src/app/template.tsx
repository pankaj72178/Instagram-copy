// A template re-mounts on every navigation, so this gives each page (and the
// very first load) a smooth fade-and-rise entrance instead of popping in.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="folo-page flex flex-1 flex-col">{children}</div>;
}
