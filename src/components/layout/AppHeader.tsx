import { PrimaryNavBar } from "./PrimaryNavBar";
import { SecondaryNavBar } from "./SecondaryNavBar";

export function AppHeader() {
  return (
    <header>
      <PrimaryNavBar />
      <SecondaryNavBar />
    </header>
  );
}
