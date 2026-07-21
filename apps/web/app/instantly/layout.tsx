import InstantlySubnav from "./instantly-subnav";

export default function InstantlyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fade-up">
      <InstantlySubnav />
      {children}
    </div>
  );
}
