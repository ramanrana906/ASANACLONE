import { colorForKey, initials } from "../../lib/identity";

interface AvatarProps {
  name: string;
  userKey: string | number;
  size?: number;
}

export function Avatar({ name, userKey, size = 28 }: AvatarProps) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: colorForKey(userKey),
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
