import { colorForKey } from "../../lib/identity";

interface ProjectIconProps {
  projectKey: string | number;
  size?: number;
}

export function ProjectIcon({ projectKey, size = 20 }: ProjectIconProps) {
  return (
    <span
      className="project-icon"
      style={{ width: size, height: size, background: colorForKey(projectKey) }}
      aria-hidden="true"
    />
  );
}
