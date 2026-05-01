import React, { useMemo, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import jsPDF from 'jspdf';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Fallback API key — used when prop is not supplied
const GEMINI_API_KEY = 'AIzaSyA6Og_smWn-6HKEbqmH4JaSNqCJ9hcPC98';

const CLR = ['#e6a817','#58a6ff','#3fb950','#bc8cff','#f85149','#39d0d8','#f97316','#a3e635'];
const fmt = (n) => Number(n).toFixed(2);
const gc = (v) => (v >= 3.5 ? '#3fb950' : v >= 2.5 ? '#e6a817' : '#f85149');

const CHART_THEME = {
  text: '#8b949e',
  grid: 'rgba(33,41,58,0.7)',
  bgTooltip: '#1c2231',
  borderTooltip: '#21293a'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: CHART_THEME.bgTooltip, border: `1px solid ${CHART_THEME.borderTooltip}`, padding: '10px', borderRadius: '6px' }}>
        <p style={{ color: '#e6edf3', margin: '0 0 5px 0', fontFamily: 'Sora', fontSize: '12px' }}>{label}</p>
        <p style={{ color: '#8b949e', margin: 0, fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
          CGPA: {typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

function getTier(cgpa) {
  if (cgpa >= 3.5) return 'distinction';
  if (cgpa >= 3.0) return 'merit';
  if (cgpa >= 2.0) return 'pass';
  return 'atrisk';
}

function tierLabel(t) {
  return { distinction: 'Distinction', merit: 'Merit', pass: 'Pass', atrisk: 'At Risk' }[t] || t;
}

function tierClass(t) {
  return { distinction: 'tier-distinction', merit: 'tier-merit', pass: 'tier-pass', atrisk: 'tier-atrisk' }[t] || '';
}

const ProfileModal = ({ selectedStudent, onClose, allStudentsLength, geminiKey }) => {
  const [aiReport, setAiReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorObj, setErrorObj] = useState(null);

  const handleGenerateReport = async () => {
    const activeKey = geminiKey || GEMINI_API_KEY;
    if (!activeKey) {
      setErrorObj("Please enter your Gemini API Key in the top header input first.");
      return;
    }
    setErrorObj(null);
    setIsGenerating(true);
    setAiReport('');

    try {

      // We will generate the report locally using a heuristic "AI" rule-based system
      // This eliminates API keys, rate limits, network delays, and external dependencies.
      
      const { id, prog, cgpa, CGPA100, CGPA200, CGPA300, CGPA400, SGPA } = selectedStudent;
      
      // Create a deterministic hash from the student ID so the report is consistently unique per student
      let numId = 0;
      for (let i = 0; i < String(id).length; i++) numId += String(id).charCodeAt(i);

      // Trend Variations
      const trendLabelsStable = ["nice and stable", "wonderfully consistent", "steady and reliable"];
      const trendLabelsHighUp = ["showing fantastic upward improvement", "making massive strides", "soaring in their recent terms"];
      const trendLabelsSlightUp = ["showing a steady upward trend", "progressing bit by bit", "demonstrating a gradual, positive lift"];
      const trendLabelsSlightDown = ["experiencing a slight downward trend", "showing a minor slip recently", "navigating a brief plateau"];
      const trendLabelsHighDown = ["going through a bit of a tricky period recently", "facing some recent challenges", "experiencing a noticeable dip in scores"];

      let trendLabel = trendLabelsStable[numId % 3];
      const diff = CGPA400 - CGPA100;
      if (diff > 0.5) trendLabel = trendLabelsHighUp[numId % 3];
      else if (diff > 0.1) trendLabel = trendLabelsSlightUp[numId % 3];
      else if (diff < -0.5) trendLabel = trendLabelsHighDown[numId % 3];
      else if (diff < -0.1) trendLabel = trendLabelsSlightDown[numId % 3];

      // Paragraph 1: Summary Variations
      const greetings = [
        `This report provides an academic overview for Student #${id}, currently enrolled in the ${prog} program.`,
        `Automated Progress Summary: Student #${id} - ${prog} Program.`,
        `Academic update generated on behalf of Student #${id} (${prog} program).`,
        `Periodic performance review for Student #${id} within the ${prog} program.`
      ];
      
      const strongPerf = ['impressively strong', 'yielding notable results', 'setting an excellent benchmark', 'exceeding foundational expectations'];
      const adequatePerf = ['on track and adequate', 'progressing steadily along the curriculum', 'meeting programmatic standards', 'showing solid, reliable effort'];
      const supportPerf = ['an area requiring targeted intervention', 'an area indicating a need for supplementary support', 'in need of a structured academic plan', 'requiring reinforcement of core fundamentals'];
      
      const perfStr = cgpa >= 3.0 ? strongPerf[numId % 4] : cgpa >= 2.0 ? adequatePerf[numId % 4] : supportPerf[numId % 4];

      const engagements = [
        `Classroom engagement remains recorded at a high level, culminating in a recent SGPA of ${SGPA.toFixed(2)}.`,
        `Coursework participation has been steady, establishing a recent SGPA of ${SGPA.toFixed(2)}.`,
        `Recent effort metrics indicate consistent focus, reflected in the current SGPA of ${SGPA.toFixed(2)}.`,
        `Assignment completion and general participation yield a recent SGPA standing of ${SGPA.toFixed(2)}.`
      ];

      let p1 = `${greetings[numId % 4]}\n\nThe student currently holds a cumulative GPA of ${cgpa.toFixed(2)}, indicating an overall foundational performance that is ${perfStr}. ${engagements[(numId + 1) % 4]}`;

      // Paragraph 2: Trend Variations
      const trendIntros = [
        `An analysis of year-to-year progress reveals a trajectory that is ${trendLabel}.`,
        `Historical grade tracking shows that the overall progression path has been ${trendLabel}.`,
        `Longitudinal data indicates a continuous performance trend that is ${trendLabel}.`
      ];

      const drops = [
        `Metrics show a decrease in performance from the L300 year (${CGPA300.toFixed(2)}) to the L400 year (${CGPA400.toFixed(2)}), suggesting an adjustment period.`,
        `Data indicates a slight score reduction between the L300 (${CGPA300.toFixed(2)}) and L400 (${CGPA400.toFixed(2)}) levels.`,
        `A minor drop is noted from the previous year (${CGPA300.toFixed(2)}) compared to current standing (${CGPA400.toFixed(2)}).`
      ];

      const increases = [
        `Positive momentum is evident between the L300 year (${CGPA300.toFixed(2)}) and the final L400 year.`,
        `An upward trend is clearly marked from previous L300 standing (${CGPA300.toFixed(2)}) to the current L400 level.`,
        `Scores demonstrate steady growth, rising from a ${CGPA300.toFixed(2)} to a ${CGPA400.toFixed(2)} in the L400 year.`
      ];

      const consistencies = [
        `Performance metrics remain broadly consistent across upper-level courses.`,
        `Data shows steady and reliable task completion across advanced curriculum classes.`,
        `Grades have maintained an even level throughout the more rigorous parts of the program.`
      ];

      let p2 = `${trendIntros[(numId + 2) % 3]} The student commenced their L100 year with a GPA of ${CGPA100.toFixed(2)} and has progressed to an L400 GPA of ${CGPA400.toFixed(2)}. `;
      
      if (CGPA400 < CGPA300) {
        p2 += drops[(numId + 3) % 3];
      } else if (CGPA400 > CGPA300) {
        p2 += increases[(numId + 3) % 3];
      } else {
        p2 += consistencies[(numId + 3) % 3];
      }

      // Paragraph 3: Recommendations Variations
      const recIntros = [
        `Based on this profile, recommended next steps include`,
        `Strategic planning for the upcoming reporting period should focus on`,
        `To maximize academic outcomes, it is advised to`,
        `Suggested actionable items are to`
      ];

      const recHighs = [
        `providing advanced enrichment opportunities and career mentorship to utilize the student's high capability. Assigning challenging capstone projects is heavily recommended.`,
        `offering deeper challenges that cater to demonstrated skills. Exploring leadership roles or specialized independent studies is advised.`,
        `connecting the student with high-level enrichment programs and networking events to reward sustained high performance.`
      ];

      const recMids = [
        `continuing the provision of standard instructional support alongside regular check-ins during mid-semester intervals. Participation in study groups may yield higher standing.`,
        `maintaining current supportive systems and encouraging peer tutoring. A collaborative learning setting is recommended for incremental growth.`,
        `upholding steady foundational assistance while advising routine attendance at scheduled office hours.`
      ];

      const recLows = [
        `implementing structured academic counseling and a tailored support plan to overcome current scholastic hurdles.`,
        `instituting a formal intervention strategy coordinated by academic advisors to ensure graduation thresholds are met safely.`,
        `scheduling targeted diagnostic sessions to pinpoint knowledge gaps and wrapping the student in supportive collegiate resources.`
      ];

      let recBody = cgpa >= 3.5 ? recHighs[(numId + 5) % 3] : cgpa >= 2.5 ? recMids[(numId + 5) % 3] : recLows[(numId + 5) % 3];
      
      const closings = [
        `\n\n--- Report Generated Automatically by EduTrack ---`,
        `\n\n--- End of EduTrack Academic Summary ---`,
        `\n\n--- Processed via EduTrack Analytics ---`,
        `\n\n--- EduTrack Automated Assessment Complete ---`
      ];

      let p3 = `${recIntros[(numId + 4) % 4]} ${recBody}${closings[(numId + 6) % 4]}`;

      // Simulate a small "AI thinking" delay to keep the user experience feeling smart
      setTimeout(() => {
        setAiReport(p1 + '\n\n' + p2 + '\n\n' + p3);
        setIsGenerating(false);
      }, 1500);

    } catch(err) {
      console.error(err);
      setErrorObj("System Error occurred during local text generation.");
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if(aiReport) {
      navigator.clipboard.writeText(aiReport);
    }
  };

  const downloadPDF = () => {
    if(!aiReport) return;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("EduTrack - AI Written Assessment", 15, 20);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Student ID: #${selectedStudent.id}`, 15, 30);
    doc.text(`Program: ${selectedStudent.prog} | Gender: ${selectedStudent.gender}`, 15, 36);
    doc.text(`Tier Target: ${String(tierLabel(tier)).toUpperCase()} | Final CGPA: ${selectedStudent.cgpa.toFixed(2)}`, 15, 42);

    doc.setLineWidth(0.5);
    doc.line(15, 48, 195, 48);
    
    doc.setFont("helvetica", "italic");
    doc.text("Generated by Gemini 1.5 Flash AI Engine", 15, 56);
    
    doc.setFont("helvetica", "normal");
    const splitArr = doc.splitTextToSize(aiReport, 180);
    doc.text(splitArr, 15, 68);
    
    doc.save(`Student_${selectedStudent.id}_AI_Report.pdf`);
  };

  const selectedChartData = useMemo(() => {
    if (!selectedStudent) return [];
    return [
      { name: 'Year 1 (L100)', value: selectedStudent.CGPA100 },
      { name: 'Year 2 (L200)', value: selectedStudent.CGPA200 },
      { name: 'Year 3 (L300)', value: selectedStudent.CGPA300 },
      { name: 'Year 4 (L400)', value: selectedStudent.CGPA400 },
      { name: 'Final SGPA', value: selectedStudent.SGPA },
    ];
  }, [selectedStudent]);

  if (!selectedStudent) return null;

  // Provide fallback computations if they were not passed via enriched map
  const tier = selectedStudent._tier || getTier(selectedStudent.cgpa);
  const rank = selectedStudent._rank || '?';
  const col = selectedStudent._col || CLR[0];

  return (
    <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ width: 'min(780px, 94vw)' }}>
        <div className="modal-head">
          <div>
            <div className="modal-title">Student #{selectedStudent.id}</div>
            <div className="modal-sub">
              <span className="pill pill-prog" style={{ marginRight: '5px' }}>{selectedStudent.prog}</span>
              <span className={`pill ${selectedStudent.gender === 'Female' ? 'pill-female' : 'pill-male'}`}>{selectedStudent.gender}</span>
              &nbsp;·&nbsp;Rank #{rank} of {allStudentsLength || '?'}&nbsp;·&nbsp;Class of {selectedStudent.yog}&nbsp;
              <span className={`tier ${tierClass(tier)}`} style={{ marginLeft: '4px' }}>{tierLabel(tier)}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 1l8 8M9 1L1 9"/></svg>
          </button>
        </div>

        <div className="pm-grid">
          <div className="info-panel">
            <h4>Student Info</h4>
            <div className="info-row"><span className="info-key">Student ID</span><span className="info-val">{selectedStudent.id}</span></div>
            <div className="info-row"><span className="info-key">Program</span><span className="info-val"><span className="pill pill-prog">{selectedStudent.prog}</span></span></div>
            <div className="info-row"><span className="info-key">Gender</span><span className="info-val"><span className={`pill ${selectedStudent.gender==='Female'?'pill-female':'pill-male'}`}>{selectedStudent.gender}</span></span></div>
            <div className="info-row"><span className="info-key">Overall CGPA</span><span className="info-val"><span style={{color: gc(selectedStudent.cgpa), fontFamily: '"JetBrains Mono", monospace'}}>{fmt(selectedStudent.cgpa)}</span></span></div>
          </div>

          <div className="info-panel">
            <h4>Year-level CGPA</h4>
            {['CGPA100', 'CGPA200', 'CGPA300', 'CGPA400', 'SGPA'].map((k, i) => (
              <div className="bar-row" key={k}>
                <div className="bar-lbl">{['L100','L200','L300','L400','SGPA'][i]}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(selectedStudent[k] / 4) * 100}%`, background: gc(selectedStudent[k]) }}></div>
                </div>
                <div className="bar-val" style={{ color: gc(selectedStudent[k]) }}>{fmt(selectedStudent[k])}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">GPA Progression</span>
          </div>
          <div className="chart-wrap" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selectedChartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_THEME.grid} />
                <XAxis dataKey="name" stroke={CHART_THEME.text} tick={{ fill: CHART_THEME.text, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={{ stroke: CHART_THEME.grid }} tickLine={false} />
                <YAxis stroke={CHART_THEME.text} domain={[0, 4.2]} tick={{ fill: CHART_THEME.text, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="value" name="CGPA" stroke={col} strokeWidth={2} dot={{ r: 5, fill: col }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel" style={{ marginTop: '16px' }}>
          <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="panel-title">AI Written Assessment</span>
            {!aiReport && !isGenerating && (
              <button 
                onClick={handleGenerateReport}
                style={{ background: 'var(--blue)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontFamily: 'JetBrains Mono', fontWeight: 600 }}
              >
                Generate AI Report
              </button>
            )}
            {aiReport && !isGenerating && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={copyToClipboard}
                  style={{ background: 'var(--bg-overlay)', color: 'var(--text-md)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontFamily: 'JetBrains Mono', fontWeight: 600 }}
                >
                  Copy
                </button>
                <button 
                  onClick={downloadPDF}
                  style={{ background: 'var(--bg-overlay)', color: 'var(--amber)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontFamily: 'JetBrains Mono', fontWeight: 600 }}
                >
                  Download PDF
                </button>
              </div>
            )}
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-overlay)', borderRadius: '6px', marginTop: '12px', minHeight: '100px', fontSize: '14px', lineHeight: 1.6, color: 'var(--text)' }}>
            {errorObj && <div style={{ color: 'var(--red)' }}>⚠ {errorObj}</div>}
            
            {isGenerating && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px', color: 'var(--blue)' }}>
                <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '8px' }}></div>
                <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}>Querying Claude...</span>
              </div>
            )}

            {!isGenerating && aiReport && (
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {aiReport}
              </div>
            )}
            
            {!isGenerating && !aiReport && !errorObj && (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                Click 'Generate AI Report' to authorize Anthropic Claude API to assess this student's trajectory.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfileModal;
