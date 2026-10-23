import { useState } from 'react';


const LOGO_SRC = '/logo.png';
const NAMA_PERUSAHAAN = 'PT Dawuan Slamet Mulyo';

export default function Logo({ tinggi = 36, besar = false }) {
  const [gagal, setGagal] = useState(false);

  return (
    <span className={`brand${besar ? ' brand-lg' : ''}`}>
      {gagal ? (
        <span className="logo-mark" aria-hidden="true" />
      ) : (
        <img className="logo-img" src={LOGO_SRC} alt="" style={{ height: tinggi }} onError={() => setGagal(true)} />
      )}
      <span className="logo-name">{NAMA_PERUSAHAAN}</span>
    </span>
  );
}