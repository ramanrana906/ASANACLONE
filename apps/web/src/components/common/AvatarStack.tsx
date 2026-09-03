import { Avatar } from "./Avatar";

interface AvatarStackPerson {
  id: string | number;
  name: string;
}

interface AvatarStackProps {
  people: AvatarStackPerson[];
  size?: number;
  max?: number;
}

export function AvatarStack({ people, size = 24, max = 4 }: AvatarStackProps) {
  if (people.length === 0) return null;
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;

  return (
    <div className="avatar-stack">
      {visible.map((person) => (
        <span className="avatar-stack__item" key={person.id} title={person.name}>
          <Avatar name={person.name} userKey={person.id} size={size} />
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="avatar-stack__overflow"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
          title={`+${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
