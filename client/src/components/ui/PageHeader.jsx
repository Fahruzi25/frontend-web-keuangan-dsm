import { Link } from 'react-router-dom';


export default function PageHeader({ title, hint, back, actions }) {
  return (
    <header className="page-head">
      <div>
        {back && <Link to={back.to} className="back-link">← {back.label}</Link>}
        <h1>{title}</h1>
        {hint && <p className="hint">{hint}</p>}
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </header>
  );
}
