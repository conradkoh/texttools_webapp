export function Condition(p: { render: boolean; children: any }) {
  return p.render ? p.children : null;
}
