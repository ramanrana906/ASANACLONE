import { Logotype } from "./Logo";
import { BoardIllustration } from "./BoardIllustration";

const HIERARCHY = [
  { label: "Workspace", color: "var(--card-blue)" },
  { label: "Project", color: "var(--card-green)" },
  { label: "Board", color: "var(--card-purple)" },
  { label: "Task", color: "var(--card-yellow)" },
];

export function BrandPanel() {
  return (
    <aside className="brand-panel">
      <div className="brand-panel__content">
        <Logotype size={30} className="brand-panel__logo" />
        <p className="brand-panel__tagline">A clear line from idea to done.</p>
        <BoardIllustration />
        <ul className="brand-panel__hierarchy" aria-label="How work is organized">
          {HIERARCHY.map((level) => (
            <li key={level.label}>
              <span
                className="brand-panel__hierarchy-dot"
                style={{ background: level.color }}
              />
              {level.label}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
