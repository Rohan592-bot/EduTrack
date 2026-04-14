import React, { useCallback, useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, File, AlertCircle } from 'lucide-react';

const FileUpload = ({ onDataParsed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileInput = (e) => {
    setError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error parsing the CSV file.');
          console.error(results.errors);
        } else {
          onDataParsed(results.data);
        }
      },
      error: (err) => {
        setError(err.message);
      }
    });
  };

  return (
    <div className="upload-container animate-fade-in">
      <div 
        className="glass-panel upload-card"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('csvInput').click()}
        style={isDragging ? { borderColor: 'var(--accent-primary)', transform: 'scale(1.02)' } : {}}
      >
        <input 
          id="csvInput"
          type="file" 
          accept=".csv" 
          style={{ display: 'none' }} 
          onChange={handleFileInput}
        />
        
        {error ? (
          <AlertCircle size={48} className="upload-icon" style={{ color: 'var(--accent-danger)' }} />
        ) : (
          isDragging ? <File size={48} className="upload-icon" /> : <UploadCloud size={48} className="upload-icon" />
        )}
        
        <h3 className="upload-text text-gradient">
          {error ? error : "Upload Student Performance Data"}
        </h3>
        <p className="upload-subtext">
          Drag and drop your CSV file here, or click to browse
        </p>
      </div>
    </div>
  );
};

export default FileUpload;
