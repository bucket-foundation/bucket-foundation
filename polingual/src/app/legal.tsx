import Site from "./site";

export default function Legal({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <Site wide={wide}>{children}</Site>;
}
