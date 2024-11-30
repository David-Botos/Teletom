import ExpiryTimer from "@/app/_components/callInterface/Header/ExpiryTimer";

export function Header() {
  return (
    <header
      id="header"
      className="w-full flex self-start items-center p-[--app-padding] pb-0 justify-between"
    >
      <ExpiryTimer />
    </header>
  );
}

export default Header;
