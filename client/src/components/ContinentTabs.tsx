import type { Continent } from "../api/learning";
import lockIcon from "../assets/icons/lock.svg";
import "../styles/components/ContinentTabs.css";

interface ContinentTabsProps {
  continents: Continent[];
  selectedId: number;
  onSelect: (id: number) => void;
}

// 대륙 선택 탭
export default function ContinentTabs({
  continents,
  selectedId,
  onSelect,
}: ContinentTabsProps) {
  return (
    <div className="continent-tabs" role="tablist" aria-label="대륙 선택">
      {continents.map((c) => {
        const closed = c.locked || !c.ready;
        const classes = [
          "continent-tab",
          c.id === selectedId ? "continent-tab--selected" : "",
          closed ? "continent-tab--closed" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === selectedId}
            className={classes}
            onClick={() => onSelect(c.id)}
          >
            {c.locked && <img src={lockIcon} alt="" />}
            <span>{c.name}대륙</span>
            {c.ready ? (
              !c.locked && (
                <span>
                  {c.cleared} / {c.total}
                </span>
              )
            ) : (
              <span>준비 중</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
