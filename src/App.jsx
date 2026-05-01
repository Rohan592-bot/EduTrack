import React, { Suspense, lazy, useEffect, useState } from 'react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Analytics } from '@vercel/analytics/react';

const Overview = lazy(() => import('./components/Overview'));
const Profiles = lazy(() => import('./components/Profiles'));
const Compare = lazy(() => import('./components/Compare'));
const Semester = lazy(() => import('./components/Semester'));
const AllStudents = lazy(() => import('./components/AllStudents'));
const Predictor = lazy(() => import('./components/Predictor'));
const EarlyWarning = lazy(() => import('./components/EarlyWarning'));
const AnomalyDetection = lazy(() => import('./components/AnomalyDetection'));
const Clustering = lazy(() => import('./components/Clustering'));
const TrajectoryForecast = lazy(() => import('./components/TrajectoryForecast'));
const ProfileModal = lazy(() => import('./components/ProfileModal'));
function App() {
  const [students, setStudents] = useState([]);
  const [activePage, setActivePage] = useState('overview');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [geminiKey, setGeminiKey] = useState(() => {
    const fromStorage = localStorage.getItem('gemini_api_key');
    return fromStorage || import.meta.env.VITE_GEMINI_API_KEY || '';
  });
  const [exportDropOpen, setExportDropOpen] = useState(false);
  const [globalSelectedStudent, setGlobalSelectedStudent] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('gemini_api_key', geminiKey);
  }, [geminiKey]);



  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.errors.length) {
          // Normalize column names to camelCase or standardized keys if preferred, 
          // but we can just keep the original keys to match previous design logic
          const parsed = results.data.filter(row => row['ID No']).map(row => ({
            id: String(row['ID No']),
            prog: row['Prog Code'],
            gender: row['Gender'],
            yog: row['YoG'],
            cgpa: Number(row['CGPA']) || 0,
            CGPA100: Number(row['CGPA100']) || 0,
            CGPA200: Number(row['CGPA200']) || 0,
            CGPA300: Number(row['CGPA300']) || 0,
            CGPA400: Number(row['CGPA400']) || 0,
            SGPA: Number(row['SGPA']) || 0,
          }));
          setStudents(parsed);
        }
      }
    });
    // clear input value so same file can be uploaded again if needed
    e.target.value = '';
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <path d="M1 1h6v6H1zM9 1h6v6H9zM1 9h6v6H1zM9 9h6v6H9z" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/> },
    { id: 'profile', label: 'Student Profiles', icon: <><circle cx="8" cy="5" r="3" strokeWidth="1.4"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" strokeWidth="1.4" strokeLinecap="round"/></> },
    { id: 'compare', label: 'Compare', icon: <><path d="M3 8h10M10 5l3 3-3 3M6 5L3 8l3 3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></> },
    { id: 'semester', label: 'Semester Breakdown', icon: <path d="M1 12h14M1 8h14M1 4h14" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/> },
  ];

  const exportFile = async (format) => {
    setExportDropOpen(false);
    if (!students.length) return;

    let blob;
    let defaultFile = '';

    if (format === 'csv') {
      defaultFile = 'edutrack_students.csv';
      const header = '"ID No","Prog Code","Gender","YoG","CGPA100","CGPA200","CGPA300","CGPA400","SGPA","CGPA"\n';
      const csv = students.map(s => 
        `"${s.id}","${s.prog}","${s.gender}","${s.yog}","${s.CGPA100}","${s.CGPA200}","${s.CGPA300}","${s.CGPA400}","${s.SGPA}","${s.cgpa}"`
      ).join('\n');
      blob = new Blob([header + csv], { type: 'text/csv' });
    } else if (format === 'pdf') {
      defaultFile = 'edutrack_students.pdf';
      const doc = new jsPDF();
      doc.text("EduTrack - Student Performance Report", 14, 15);
      
      const head = [['ID No', 'Prog', 'Gender', 'L100', 'L200', 'L300', 'L400', 'SGPA', 'CGPA']];
      const data = students.map(s => [
        s.id, s.prog, s.gender, s.CGPA100.toFixed(2), s.CGPA200.toFixed(2), s.CGPA300.toFixed(2), 
        s.CGPA400.toFixed(2), s.SGPA.toFixed(2), s.cgpa.toFixed(2)
      ]);
      
      autoTable(doc, {
        head: head,
        body: data,
        startY: 20,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [230, 168, 23] } // amber
      });
      
      blob = doc.output('blob');
    }

    // Attempt to use File System Access API
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultFile,
          types: [{
            description: format === 'csv' ? 'CSV File' : 'PDF Document',
            accept: format === 'csv' ? { 'text/csv': ['.csv'] } : { 'application/pdf': ['.pdf'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Save failed:', err);
      }
    } else {
      // Fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = defaultFile; a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <>
      <div className={`nav-overlay ${isNavOpen ? 'open' : ''}`} onClick={() => setIsNavOpen(false)}></div>
      
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="hamburger" onClick={() => setIsNavOpen(!isNavOpen)} aria-label="Menu" style={{ display: 'flex' }}>
            <span></span><span></span><span></span>
          </button>
          <a className="logo" href="#">
            <div className="logo-mark">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="9" width="3" height="8" rx="1" fill="currentColor" opacity=".5"/>
                <rect x="6" y="5" width="3" height="12" rx="1" fill="currentColor" opacity=".75"/>
                <rect x="11" y="1" width="3" height="16" rx="1" fill="currentColor"/>
              </svg>
            </div>
            <span>Edu<strong>Track</strong></span>
          </a>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {students.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button className="hdr-btn" onClick={() => setExportDropOpen(!exportDropOpen)} title="Export data">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.5 1v7M3.5 5.5L6.5 9l3-3.5"/><path d="M1 9.5v1A1.5 1.5 0 002.5 12h8A1.5 1.5 0 0012 10.5v-1"/>
                </svg>
                <span className="btn-label">Export</span>
              </button>
              {exportDropOpen && (
                <div className="cmp-dropdown" style={{ display: 'block', top: 'calc(100% + 4px)', right: 0, left: 'auto', minWidth: '140px' }}>
                  <div className="cmp-di" onClick={() => exportFile('csv')}>
                    <span style={{color: 'var(--amber)'}}>Download CSV</span>
                  </div>
                  <div className="cmp-di" onClick={() => exportFile('pdf')}>
                    <span style={{color: 'var(--red)'}}>Download PDF</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <input 
            type="password" 
            name="gemini_api_key_hidden"
            autoComplete="new-password"
            placeholder="Gemini API Key (Google)" 
            value={geminiKey} 
            onChange={e => setGeminiKey(e.target.value)} 
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-overlay)', color: 'var(--text-hi)', fontSize: '12px', width: '200px' }} 
          />
          <button className="hdr-btn" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title="Toggle Theme" style={{ padding: '6px', width: '32px', height: '32px', justifyContent: 'center' }}>
            {theme === 'light' ? (
               <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            ) : (
               <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            )}
          </button>
          <label className="upload-btn">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 1v7M3.5 3.5L6.5 1l3 2.5"/><path d="M1 9.5v1A1.5 1.5 0 002.5 12h8A1.5 1.5 0 0012 10.5v-1"/>
            </svg>
            <span className="btn-label">Upload CSV</span>
            <input type="file" id="csvInput" accept=".csv" onChange={handleFileUpload} />
          </label>
        </div>
      </header>

      <div className="shell">
        <nav id="main-nav" className={isNavOpen ? 'open' : ''}>
          <button className="nav-close" onClick={() => setIsNavOpen(false)} aria-label="Close menu">
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 1l8 8M9 1L1 9"/></svg>
          </button>
          
          <div className="nav-group-label">Views</div>
          {navItems.map(item => (
            <button 
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => { setActivePage(item.id); setIsNavOpen(false); }}
            >
              <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                {item.icon}
              </svg>
              {item.label}
            </button>
          ))}
          
          <div className="nav-group-label" style={{ marginTop: '8px' }}>Data</div>
          <button className={`nav-item ${activePage === 'all' ? 'active' : ''}`} onClick={() => { setActivePage('all'); setIsNavOpen(false); }}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="1" width="14" height="14" rx="2"/><path d="M1 5h14M5 5v10"/>
            </svg>
            All Students
          </button>
          
          <div className="nav-group-label" style={{ marginTop: '8px' }}>AI / ML</div>
          <button className={`nav-item ${activePage === 'predict' ? 'active' : ''}`} onClick={() => { setActivePage('predict'); setIsNavOpen(false); }}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.42 1.42M11.36 11.36l1.42 1.42M3.22 12.78l1.42-1.42M11.36 4.64l1.42-1.42"/>
            </svg>
            GPA Predictor
          </button>
          <button className={`nav-item ${activePage === 'early-warning' ? 'active' : ''}`} onClick={() => { setActivePage('early-warning'); setIsNavOpen(false); }}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 1.5l-7 13h14l-7-13z" /><path d="M8 7v4M8 13h.01" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Early Warning Hub
          </button>
          <button className={`nav-item ${activePage === 'anomaly' ? 'active' : ''}`} onClick={() => { setActivePage('anomaly'); setIsNavOpen(false); }}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 13h12M4 9l4-5 4 5M8 4v7" />
            </svg>
            Anomaly Detection
          </button>
          <button className={`nav-item ${activePage === 'cluster' ? 'active' : ''}`} onClick={() => { setActivePage('cluster'); setIsNavOpen(false); }}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="4" cy="4" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="4" cy="12" r="2"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" strokeDasharray="2 2" />
            </svg>
            Student Clustering
          </button>
          <button className={`nav-item ${activePage === 'trajectory' ? 'active' : ''}`} onClick={() => { setActivePage('trajectory'); setIsNavOpen(false); }}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 13h14M3 9l3-3 4 4 4-6" />
            </svg>
            Trajectory Forecast
          </button>
        </nav>

        <main className="content">
          <Suspense fallback={<div style={{ padding: '12px' }}>Loading view...</div>}>
            {activePage === 'overview' && <Overview students={students} />}
            {activePage === 'profile' && <Profiles students={students} />}
            {activePage === 'compare' && <Compare students={students} />}
            {activePage === 'semester' && <Semester students={students} />}
            {activePage === 'all' && <AllStudents students={students} onDelete={(id) => setStudents(prev => prev.filter(s => s.id !== id))} />}
            {activePage === 'predict' && <Predictor students={students} />}
            {activePage === 'early-warning' && <EarlyWarning students={students} />}
            {activePage === 'anomaly' && <AnomalyDetection students={students} onOpenProfile={(id) => setGlobalSelectedStudent(students.find(s => s.id === id))} />}
            {activePage === 'cluster' && <Clustering students={students} onOpenProfile={(id) => setGlobalSelectedStudent(students.find(s => s.id === id))} />}
            {activePage === 'trajectory' && <TrajectoryForecast students={students} />}
          </Suspense>
        </main>
      </div>

      {globalSelectedStudent && (
        <Suspense fallback={null}>
          <ProfileModal 
            selectedStudent={globalSelectedStudent} 
            onClose={() => setGlobalSelectedStudent(null)} 
            allStudentsLength={students.length} 
            geminiKey={geminiKey}
          />
        </Suspense>
      )}
      <Analytics />
    </>
  );
}

export default App;
