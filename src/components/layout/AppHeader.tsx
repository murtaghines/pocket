import { useState } from "react";
import { PrimaryNavBar } from "./PrimaryNavBar";
import { SecondaryNavBar } from "./SecondaryNavBar";

export function AppHeader() {
  const [subNavOpen, setSubNavOpen] = useState(true);

  return (
    <header>
      <PrimaryNavBar subNavOpen={subNavOpen} onToggleSubNav={() => setSubNavOpen((v) => !v)} />
      <SecondaryNavBar visible={subNavOpen} />
    </header>
  );
}
