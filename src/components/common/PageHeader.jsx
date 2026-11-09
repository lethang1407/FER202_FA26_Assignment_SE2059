import { Stack } from 'react-bootstrap';

export default function PageHeader({ title, description, actions }) {
  return (
    <Stack
      direction="horizontal"
      className="justify-content-between align-items-start gap-3 mb-4"
    >
      <div>
        <h1 className="h3 mb-1">{title}</h1>
        {description && <p className="text-secondary mb-0">{description}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </Stack>
  );
}
