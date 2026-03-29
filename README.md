# EduTrack — Student Performance Dashboard

A fast, professional dark-mode dashboard for tracking and analyzing student academic performance across multiple semesters. Built with pure HTML, CSS, and JavaScript — no frameworks, no build step, no backend required.

![EduTrack Dashboard](https://img.shields.io/badge/EduTrack-Student%20Dashboard-e6a817?style=for-the-badge)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

---

## Features

### 📊 Class Overview
- KPI cards showing total students, class average CGPA, top performer, and gender split
- **GPA Distribution Histogram** — see how many students fall in each performance band at a glance
- **Statistics Strip** — median, standard deviation, min/max CGPA, pass rate, and distinction rate
- Class GPA trend line across all year levels
- Performance by program and gender comparison charts
- **Most Improved / Most Declined** — top 5 students with the biggest year-on-year CGPA swing

### 👤 Student Profiles
- Searchable, scrollable list of all students with live filtering
- **Performance Tier filter chips** — instantly isolate Distinction / Merit / Pass / At-Risk students with one click
- Each card shows CGPA, SGPA, class rank, and tier badge
- Click any student to open a detailed modal with:
  - Full student info and tier classification
  - Animated year-level GPA bars
  - GPA progression line chart
  - **Print to PDF** — clean, white, print-ready individual report

### ⚡ Compare Students
- Search for students by ID or program
- Add any number of students to a comparison list
- View side-by-side GPA progression line chart and CGPA ranking bar chart in a popup modal

### 📅 Semester Breakdown
- Average CGPA card per year level with top performer callout
- Color-coded CGPA heatmap (first 100 students)
- Per year-level ranking tables with performance vs class average

### 🗂 All Students Table
- Full ranked data table with tier badges and trend arrows
- Paginated at 50 rows per page for performance with 3000+ students
- Delete any student directly from the table

### 💾 Export & Import
- Upload any CSV file via the header button or the inline empty-state prompt
- Export all students as CSV
- Export only the current filtered view (e.g. only At-Risk students) as CSV

---

## Performance

Built to handle **3000+ students** without slowdown:

| Technique | What it solves |
|---|---|
| Virtual scroll with IntersectionObserver | Only 50 student cards in the DOM at a time |
| Debounced search (250 ms) | No lag while typing in search boxes |
| Pre-built search index | O(1) text matching instead of re-computing on every keystroke |
| Pre-built rank map | Rank lookup is instant, not recalculated per render |
| Dirty flags | Pages only re-render when data actually changes |
| Paginated table (50 rows) | No freezing when rendering thousands of table rows |
| Chart data capping | Bar charts capped at top 50 to stay readable and fast |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/edutrack.git
cd edutrack
```

### 2. Open in a browser

No build step needed. Just open `index.html` directly:

```bash
# macOS
open index.html

# Windows
start index.html

# Linux
xdg-open index.html
```

Or serve it locally with any static file server:

```bash
# Python
python -m http.server 5500

# Node.js (npx serve)
npx serve .
```

Then visit `http://localhost:5500` in your browser.

---

## CSV Format

Upload a `.csv` file with the following columns:

| Column | Description | Example |
|---|---|---|
| `ID No` | Student ID number | `42308` |
| `Prog Code` | Program / course code | `BCH` |
| `Gender` | `Male` or `Female` | `Female` |
| `YoG` | Year of graduation | `2010` |
| `CGPA` | Overall cumulative GPA | `3.58` |
| `CGPA100` | Year 1 cumulative GPA | `3.25` |
| `CGPA200` | Year 2 cumulative GPA | `4.26` |
| `CGPA300` | Year 3 cumulative GPA | `3.37` |
| `CGPA400` | Year 4 cumulative GPA | `3.47` |
| `SGPA` | Final semester GPA | `3.02` |

### Sample CSV

```csv
ID No,Prog Code,Gender,YoG,CGPA,CGPA100,CGPA200,CGPA300,CGPA400,SGPA
42308,ICE,Female,2010,3.23,2.88,3.48,2.62,2.90,3.13
70978,BCH,Female,2010,3.58,3.25,4.26,3.37,3.47,3.02
31602,BCH,Male,2010,2.21,1.78,1.98,1.49,2.51,2.19
63847,BCH,Male,2010,2.70,2.67,2.44,2.00,2.35,3.19
30158,BCH,Female,2010,3.88,3.61,3.69,3.63,4.58,4.24
```

> The dashboard starts completely empty. Upload your own CSV to populate it.

---

## Performance Tier System

Students are automatically classified based on their overall CGPA:

| Tier | CGPA Range | Color |
|---|---|---|
| 🟢 Distinction | ≥ 3.5 | Green |
| 🔵 Merit | 3.0 – 3.49 | Blue |
| 🟡 Pass | 2.0 – 2.99 | Amber |
| 🔴 At Risk | < 2.0 | Red |

Tier badges appear on student cards, in the data table, inside the profile modal, in semester rankings, and in the compare dropdown.

---

## File Structure

```
edutrack/
├── index.html      # Page structure and modals
├── style.css       # All styling (dark theme design system)
├── script.js       # All logic (rendering, search, charts, export)
└── README.md
```

---

## Built With

- **[Chart.js 4.4](https://www.chartjs.org/)** — all charts and graphs
- **[Google Fonts](https://fonts.google.com/)** — Sora, Inter, JetBrains Mono
- **IntersectionObserver API** — virtual scroll sentinel
- **FileReader API** — CSV upload
- **Blob + URL.createObjectURL** — CSV export

No npm. No webpack. No React. Just three files.

---

## Browser Support

| Browser | Support |
|---|---|
| Chrome 80+ | ✅ Full |
| Firefox 75+ | ✅ Full |
| Safari 14+ | ✅ Full |
| Edge 80+ | ✅ Full |

---

## License

MIT License — free to use, modify, and distribute.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request
