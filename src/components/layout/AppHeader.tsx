import { PrimaryNavBar } from "./PrimaryNavBar";
import { SecondaryNavBar } from "./SecondaryNavBar";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30">
      <PrimaryNavBar />
      <SecondaryNavBar />
    </header>
  );
}
