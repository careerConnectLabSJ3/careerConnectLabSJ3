import { useEffect, useRef, useState } from "react";
import editSvgIcon from "/img/edit-pen.svg";

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

export default function Profile(){

  const [error, setError] = useState('');
  const [isDisabled, setIsDisabled] = useState(true);
  const [isHidden, setIsHidden] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [formData, setFormData] = useState({
    name: "",
    education: "",
    experience: "",
    skills: "",
    pfpUpload: null
  });
  const [originalFormData, setOriginalFormData] = useState(null);
  const [role, setRole] = useState('');
  const [resume, setResume] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeError, setResumeError] = useState('');
  const [resumeMessage, setResumeMessage] = useState('');
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeProgress, setResumeProgress] = useState(0);
  const resumeInputRef = useRef(null);

  async function handleProfileInit(){
    try{
      const res = await fetch('/api/user-profile', { credentials: 'include' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to load profile.');
      }

      const profileData = {
        name: data.name || "",
        education: data.education || "",
        experience: data.experience || "",
        skills: data.skills || "",
        pfpUpload: null
      };

      setFormData(profileData);
      setOriginalFormData(profileData);
      setRole(data.role || '');
      setResume(data.resume || null);
    }
    catch(e){
      console.error(e.message);
      setError(e.message);
    }
  }

  async function handleSave(e){
    e.preventDefault();

    const hasTextChanged =
      formData.name !== originalFormData?.name ||
      formData.education !== originalFormData?.education ||
      formData.experience !== originalFormData?.experience ||
      formData.skills !== originalFormData?.skills;

    const hasNewFile = formData.pfpUpload !== null;

    if(!hasTextChanged && !hasNewFile){
      handleProfileEdit();
      return;
    }

    try{
      const maxSizeInBytes = 2 * 1024 * 1024;
      if(formData.pfpUpload && formData.pfpUpload.size > maxSizeInBytes){
        throw new Error("File size exceeds 2MB limit. Please choose a smaller image.");
      }

      const data = new FormData();
      ['name', 'education', 'experience', 'skills', 'pfpUpload'].forEach((key) => {
        if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      const res = await fetch('/api/profile', {
        method: 'POST',
        credentials: 'include',
        body: data,
      });

      const result = await res.json();

      if(!res.ok){
        throw new Error(result.error || 'Profile update failed.');
      }

      const savedFormData = {...formData, pfpUpload: null};
      setFormData(savedFormData);
      setOriginalFormData(savedFormData);
      handleProfileEdit();
      setAvatarVersion(Date.now());
    }
    catch(e){
      console.error("Profile update error: ", e.message);
      setError(e.message);
    }
  }

  function handleProfileEdit(){
    setIsDisabled((current) => !current);
    setIsHidden((current) => !current);
    setError("");
  }

  function handleCancel(){
    if (originalFormData) {
      setFormData({...originalFormData, pfpUpload: null});
    }
    handleProfileEdit();
  }

  function handleResumeFileChange(event){
    const file = event.target.files[0];
    setResumeError('');
    setResumeMessage('');

    if (!file) {
      setResumeFile(null);
      return;
    }

    const isPdf = file.type === 'application/pdf' && file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setResumeFile(null);
      event.target.value = '';
      setResumeError('Only PDF files can be uploaded as resumes.');
      return;
    }

    if (file.size > MAX_RESUME_SIZE) {
      setResumeFile(null);
      event.target.value = '';
      setResumeError('Resume must be 5MB or smaller.');
      return;
    }

    setResumeFile(file);
  }

  function handleResumeButtonClick(){
    if (!resumeFile) {
      resumeInputRef.current?.click();
      return;
    }

    uploadResume();
  }

  function uploadResume(){
    if (!resumeFile || resumeUploading) return;

    setResumeUploading(true);
    setResumeProgress(0);
    setResumeError('');
    setResumeMessage('');

    const data = new FormData();
    data.append('resumeUpload', resumeFile);

    const request = new XMLHttpRequest();
    request.open('POST', '/api/profile/resume');
    request.withCredentials = true;
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        setResumeProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener('load', () => {
      let result = {};
      try {
        result = JSON.parse(request.responseText || '{}');
      } catch {
        result = {};
      }

      if (request.status < 200 || request.status >= 300) {
        setResumeError(result.error || 'Unable to upload the resume.');
      } else {
        setResume(result.resume);
        setResumeFile(null);
        setResumeMessage(result.message || 'Resume uploaded successfully.');
        setResumeProgress(100);
        if (resumeInputRef.current) resumeInputRef.current.value = '';
      }
      setResumeUploading(false);
    });
    request.addEventListener('error', () => {
      setResumeError('Unable to upload the resume. Please try again.');
      setResumeUploading(false);
    });
    request.send(data);
  }

  async function handleResumeDelete(){
    if (!resume || resumeUploading) return;

    setResumeError('');
    setResumeMessage('');

    try {
      const res = await fetch('/api/profile/resume', {
        method: 'DELETE',
        credentials: 'include'
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Unable to delete the resume.');
      }

      setResume(null);
      setResumeMessage(result.message || 'Resume deleted successfully.');
    } catch (e) {
      setResumeError(e.message);
    }
  }

  useEffect(() => {
    handleProfileInit();
  }, []);

  return(
    <form id="profile-form" encType="multipart/form-data" onSubmit={handleSave}>
      <section className="profile-main">
        <img src={`/api/profile/avatar?v=${avatarVersion}`} alt="Profile Picture" id="profile-img"/>
        <input type="file" id="pfp-upload" name="pfpUpload" accept="image/png, image/jpeg"
          style={{ visibility: !isHidden ? 'hidden' : 'visible' }}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, pfpUpload: e.target.files[0] }));
          }}
        />
        {error && <p className="auth-error">{error}</p>}
        <section className="profile-main-info">
          <span className="right-align" style={{ visibility: isHidden ? 'hidden' : 'visible' }}>
            <button type="button" id="profile-edit-icon" onClick={handleProfileEdit}>
              <img src={editSvgIcon} className="icon"/>
            </button>
          </span>
          <section>
            <label htmlFor="profile-name">Name</label>
            <input type="text" id="profile-name" name="name" disabled={isDisabled}
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}/>
          </section>
          <section>
            <label htmlFor="profile-education">Education</label>
            <input type="text" id="profile-education" name="education" disabled={isDisabled}
              value={formData.education}
              onChange={(e) => setFormData({...formData, education: e.target.value})}/>
          </section>
          <section>
            <label htmlFor="profile-work-exp">Work Experience</label>
            <input type="text" id="profile-work-exp" name="experience" disabled={isDisabled}
              value={formData.experience}
              onChange={(e) => setFormData({...formData, experience: e.target.value})}/>
          </section>
          <section>
            <label htmlFor="profile-skills">Skills</label>
            <input type="text" id="profile-skills" name="skills" disabled={isDisabled}
              value={formData.skills}
              onChange={(e) => setFormData({...formData, skills: e.target.value})}/>
          </section>
        </section>
        <section id="buttons-profile-edit" style={{ visibility: !isHidden ? 'hidden' : 'visible' }}>
          <button type="submit" id="profile-save-btn">Save</button>
          <button type="button" id="profile-cancel-btn" onClick={handleCancel}>Cancel</button>
        </section>

        {role === 'job_seeker' && <section className="resume-section" aria-labelledby="resume-heading">
          <h2 id="resume-heading">Resume</h2>
          {resume ? (
            <p className="resume-file">
              Current file: <a href="/api/profile/resume" target="_blank" rel="noreferrer">{resume.fileName}</a>
            </p>
          ) : (
            <p className="resume-file">No resume uploaded.</p>
          )}
          <input
            ref={resumeInputRef}
            type="file"
            id="resume-upload"
            name="resumeUpload"
            accept="application/pdf,.pdf"
            onChange={handleResumeFileChange}
            hidden
          />
          {resumeFile && <p className="resume-selected">Selected: {resumeFile.name}</p>}
          <div className="resume-actions">
            <button type="button" className="resume-upload-btn" onClick={handleResumeButtonClick} disabled={resumeUploading}>
              {resumeUploading ? 'Uploading...' : resumeFile ? 'Upload Resume' : resume ? 'Replace Resume' : 'Upload Resume'}
            </button>
            {resume && (
              <button type="button" className="resume-delete-btn" onClick={handleResumeDelete} disabled={resumeUploading}>
                Delete Resume
              </button>
            )}
          </div>
          {resumeUploading && (
            <div className="resume-progress" role="progressbar" aria-valuenow={resumeProgress} aria-valuemin="0" aria-valuemax="100">
              <span style={{ width: `${resumeProgress}%` }}/>
              <small>{resumeProgress}%</small>
            </div>
          )}
          {resumeError && <p className="auth-error">{resumeError}</p>}
          {resumeMessage && <p className="profile-success">{resumeMessage}</p>}
          <p className="resume-help">PDF files only, maximum 5MB.</p>
        </section>}
      </section>
    </form>
  );
}
