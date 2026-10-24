import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import RekapProjectTab from './RekapProjectTab';
import RekapOperasionalTab from './RekapOperasionalTab';

const TAB = [
  { key: 'project', label: 'Rekap Project' },
  { key: 'operasional', label: 'Rekap Operasional' },
];

/** Satu halaman Rekap dengan dua pilihan, seperti Rekening Koran Giro (global / kas). Pilihan tersimpan di alamat. */
export default function RekapPage() {
  const [params, setParams] = useSearchParams();
  const tampilan = params.get('tampilan') === 'operasional' ? 'operasional' : 'project';

  return (
    <div className="page">
      <PageHeader title="Rekap" />

      <div className="seg" role="group" aria-label="Pilih rekap">
        {TAB.map((t) => (
          <button key={t.key} type="button" aria-pressed={tampilan === t.key} onClick={() => setParams({ tampilan: t.key })}>
            {t.label}
          </button>
        ))}
      </div>

      {tampilan === 'project' ? <RekapProjectTab /> : <RekapOperasionalTab />}
    </div>
  );
}
