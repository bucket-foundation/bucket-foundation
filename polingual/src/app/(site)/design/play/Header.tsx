import { ME } from "./mock";
import { Avatar, TierBadge } from "../../play-kit/parts";
import s from "./design.module.css";

export default function Header() {
  return (
    <header className={s.bar}>
      <a href="/design/play/home" className={s.brand}>
        <img src="/brand/kit/mark.svg" alt="" width={32} height={32} />
        <span>polingual play</span>
      </a>
      <div className={s.barRight}>
        <TierBadge tier={ME.tier} small />
        <a href="/design/play/shop" className={s.coins} aria-label={`${ME.coins} coins, open shop`}><span className={s.coin} aria-hidden />{ME.coins.toLocaleString("en-US")}</a>
        <a href="/design/play/profile" aria-label="Profile"><Avatar look={ME.look} size={36} /></a>
      </div>
    </header>
  );
}

