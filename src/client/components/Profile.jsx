import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link } from 'react-router-dom';
import "./Profile.css";
import ProfileIcon from "./ProfileIcon";
import ProfileAnalytics, { RecruiterAnalytics } from "./ProfileAnalytics";
import "./ProfileAnalytics.css";

function IconButton({ icon, label, className = '', ...props }) {
  return <button type="button" className={`profile-icon-button ${className}`} aria-label={label} title={label} {...props}><ProfileIcon name={icon}/></button>;
}

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

export default function Profile(){

  const [error, setError] = useState('');
  const [isDisabled, setIsDisabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
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
  const avatarInputRef = useRef(null);
  const resumeRequestControllerRef = useRef(null);

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
    if (saving) return;

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

    setSaving(true);
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
    finally { setSaving(false); }
  }

  function handleProfileEdit(){
    setIsDisabled((current) => !current);
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

  async function uploadResume(){
    if (!resumeFile || resumeUploading) return;

    setResumeUploading(true);
    setResumeProgress(0);
    setResumeError('');
    setResumeMessage('');

    const data = new FormData();
    data.append('resumeUpload', resumeFile);
    const requestController = new AbortController();
    resumeRequestControllerRef.current = requestController;

    try {
      const response = await axios.post('/api/profile/resume', data, {
        withCredentials: true,
        signal: requestController.signal,
        onUploadProgress: (event) => {
          if (event.total) {
            setResumeProgress(Math.round((event.loaded / event.total) * 100));
          }
        }
      });

      setResume(response.data.resume);
      setResumeFile(null);
      setResumeMessage(response.data.message || 'Resume uploaded successfully.');
      setResumeProgress(100);
      if (resumeInputRef.current) resumeInputRef.current.value = '';
    } catch (error) {
      if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
        return;
      }
      setResumeError(
        error.response?.data?.error ||
        (error.request ? 'Unable to reach the server. Please try again.' : 'Unable to upload the resume.')
      );
    } finally {
      resumeRequestControllerRef.current = null;
      setResumeUploading(false);
    }
  }

  function cancelResumeUpload(){
    resumeRequestControllerRef.current?.abort();
    setResumeFile(null);
    setResumeError('');
    setResumeMessage('');
    setResumeProgress(0);
    setResumeUploading(false);
    if (resumeInputRef.current) resumeInputRef.current.value = '';
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

  useEffect(() => {
    if (!formData.pfpUpload) { setAvatarPreview(''); return; }
    const url = URL.createObjectURL(formData.pfpUpload);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [formData.pfpUpload]);

  const fields = [
    { key: 'education', label: 'Education', icon: 'education', placeholder: 'School, degree, or certification' },
    { key: 'experience', label: 'Experience', icon: 'work', placeholder: 'Your roles and accomplishments' },
    { key: 'skills', label: 'Skills', icon: 'skills', placeholder: 'Separate skills with commas' },
  ];
  const uploadLabel = resumeUploading ? 'Saving resume' : resumeFile ? 'Save resume' : resume ? 'Replace resume' : 'Upload resume';

  return (
    <div className="profile-page">
      <div className="profile-page-heading">
        <div><p className="profile-eyebrow">YOUR SPACE</p><h1>Profile</h1></div>
        <p>A little about you. A step toward what’s next.</p>
      </div>
      <form id="profile-form" encType="multipart/form-data" onSubmit={handleSave}>
        <div className="profile-layout">
          <section className="profile-card" aria-label="Personal profile">
            <div className="profile-identity">
              <div className="profile-avatar-wrap">
                <img className="profile-avatar" src={avatarPreview || `/api/profile/avatar?v=${avatarVersion}`} alt="Your profile" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/img/default-pfp.png'; }}/>
                {!isDisabled && <IconButton icon="camera" label="Change profile photo" className="profile-camera" disabled={saving} onClick={() => avatarInputRef.current?.click()}/>}
                <input ref={avatarInputRef} type="file" id="pfp-upload" name="pfpUpload" accept="image/png,image/jpeg" hidden disabled={isDisabled || saving} onChange={(event) => setFormData(prev => ({ ...prev, pfpUpload: event.target.files[0] || null }))}/>
              </div>
              <div className="profile-identity-text">
                <p className="profile-eyebrow">{role === 'job_seeker' ? 'JOB SEEKER' : role === 'recruiter' ? 'RECRUITER' : 'PERSONAL PROFILE'}</p>
                {isDisabled ? <h2>{formData.name || 'Your name'}</h2> : <><label className="profile-field-label" htmlFor="profile-name">Name</label><input autoFocus id="profile-name" name="name" value={formData.name} disabled={saving} placeholder="Your name" onChange={(event) => setFormData({ ...formData, name: event.target.value })}/></>}
                {!isDisabled && <p className="profile-hint">Photo: JPG or PNG · up to 2 MB</p>}
              </div>
              {isDisabled && <IconButton icon="edit" label="Edit profile" disabled={!originalFormData} onClick={handleProfileEdit}/>}
            </div>
            {error && <p className="profile-notice profile-notice-error" role="alert">{error}</p>}
            <div className="profile-details">
              {fields.map(({ key, label, icon, placeholder }) => (
                <section className="profile-detail" key={key} aria-labelledby={`heading-${key}`}>
                  <span className="profile-detail-icon"><ProfileIcon name={icon}/></span>
                  <div>
                    <h3 id={`heading-${key}`}>{isDisabled ? label : <label htmlFor={`profile-${key}`}>{label}</label>}</h3>
                    {!isDisabled ? <textarea id={`profile-${key}`} name={key} rows={key === 'experience' ? 3 : 2} value={formData[key]} disabled={saving} placeholder={placeholder} onChange={(event) => setFormData({ ...formData, [key]: event.target.value })}/> : key === 'skills' && formData.skills.trim() ? <ul className="profile-skills">{formData.skills.split(/[,;\n]/).map(skill => skill.trim()).filter(Boolean).map((skill, index) => <li key={`${skill}-${index}`}>{skill}</li>)}</ul> : <p className={formData[key] ? 'profile-detail-value' : 'profile-empty'}>{formData[key] || 'Not added yet'}</p>}
                  </div>
                </section>
              ))}
            </div>
            {!isDisabled && <div className="profile-edit-actions"><button type="button" className="profile-text-button" disabled={saving} onClick={handleCancel}>Cancel</button><button type="submit" className="profile-primary-button" disabled={saving}><ProfileIcon name="check"/>{saving ? 'Saving…' : 'Save changes'}</button></div>}
          </section>

          {role === 'job_seeker' && <aside className="profile-resume" aria-labelledby="resume-heading">
            <div className="profile-resume-heading"><span className="profile-document-icon"><ProfileIcon name="file"/></span><span className="profile-format">PDF</span></div>
            <h2 id="resume-heading">Résumé</h2>
            <p className="profile-resume-intro">Your experience, all in one place.</p>
            {resume ? <a className="profile-resume-link" href="/api/profile/resume" target="_blank" rel="noreferrer"><span>{resume.fileName}</span><ProfileIcon name="arrow"/></a> : <div className="profile-resume-empty"><ProfileIcon name="file"/><p>Add your résumé</p><span>Ready for your next opportunity.</span></div>}
            <input ref={resumeInputRef} type="file" id="resume-upload" name="resumeUpload" accept="application/pdf,.pdf" onChange={handleResumeFileChange} hidden/>
            {resumeFile && <p className="profile-selected-file">{resumeFile.name}</p>}
            <div className="profile-resume-actions">
              <button type="button" className="profile-primary-button" title={uploadLabel} aria-label={uploadLabel} onClick={handleResumeButtonClick} disabled={resumeUploading} aria-busy={resumeUploading}><ProfileIcon name={resumeFile ? 'check' : 'upload'}/>{resumeUploading ? 'Saving…' : resumeFile ? 'Save' : resume ? 'Replace' : 'Upload'}</button>
              {resumeFile && <IconButton icon="close" label="Cancel resume upload" onClick={cancelResumeUpload}/>}
              {resume && !resumeFile && <IconButton icon="trash" label="Delete resume" className="profile-delete" onClick={handleResumeDelete} disabled={resumeUploading}/>}
            </div>
            {resume && !resumeFile && !resumeUploading && <Link className="profile-review-link" to="/profile/resume-improver"><ProfileIcon name="sparkle"/><span>Review with AI</span><ProfileIcon name="arrow"/></Link>}
            {resumeUploading && <div className="profile-upload-status"><progress aria-label="Resume upload progress" value={resumeProgress} max="100"/><span>{resumeProgress}%</span></div>}
            {resumeError && <p className="profile-notice profile-notice-error" role="alert">{resumeError}</p>}
            {resumeMessage && <p className="profile-notice profile-notice-success" role="status">{resumeMessage}</p>}
            <p className="profile-hint">PDF only · up to 5 MB</p>
          </aside>}
        </div>
      </form>
      {role === 'job_seeker' && <ProfileAnalytics />}
      {role === 'recruiter' && <RecruiterAnalytics />}
    </div>
  );
}
