import { useEffect, useState } from "react";


export default function Profile(){

  const [error, setError] = useState('');
  const [isDisabled, setIsDisabled] = useState(true);
  const [isHidden, setIsHidden] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    education: "",
    experience: "",
    skills: "",
    pfpUpload: null
  });
  const [originalFormData, setOriginalFormData] = useState(null);


  async function handleProfileInit(){
    try{
      const res = await fetch('/api/user-profile');
      const data = await res.json();
      
      setFormData(data);
      setOriginalFormData(data);
    }
    catch(e){
      console.error(e.message);
      setError(e.message);
    }
  }


  async function handleSave(e){
    e.preventDefault();
    if(JSON.stringify(formData) === JSON.stringify(originalFormData)){
      handleProfileEdit();
      return;
    }

    try{
      const maxSizeInBytes = 2 * 1024 * 1024;
      if(formData.pfpUpload && formData.pfpUpload.size > maxSizeInBytes){
        throw new Error("File size exceeds 2MB limit. Please choose a smaller image.");
      }

      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null){
          data.append(key, value);
        }
      })

    
      const res = await fetch('/api/profile', 
        {
          method: 'POST',
          credentials: 'include',
          body: data,
        }
      );

      const result = await res.json();

      if(!res.ok){
        throw new Error(result.error);
      }

      setOriginalFormData({...formData});
      handleProfileEdit();
    }
    catch(e){
      console.error("Profile update error: ", e.message);
      setError(e.message);
    }
  } 


  function handleProfileEdit(){
    try{
      isDisabled ? setIsDisabled(false) : setIsDisabled(true);
      isHidden ? setIsHidden(false) : setIsHidden(true);
      setError("");
    }
    catch(e){
      console.error(e.message);
      setError(e.message);
    }
  }

  useEffect(() => {
    handleProfileInit();
  }, [])
  
  return(
    <form id="profile-form" encType="multipart/form-data" onSubmit={handleSave}>
      <section className="profile-main">
        <img src="/api/profile/avatar" alt="Profile Picture" id="profile-img"/>
        <input type="file" id="pfp-upload" name="pfpUpload" accept="image/png, image/jpeg"
          style={{
            visibility: !isHidden ? 'hidden' : 'visible'
          }}
          onChange={(e) => {
            setFormData(prev => (
              {
                ...prev,
                pfpUpload: e.target.files[0]
              }));
          }}
          />
        {error && (
        <p className="auth-error">
            {error}
        </p>
        )}
        <section className="profile-main-info">
          <span className="right-align"  
            style={{
              visibility: isHidden ? 'hidden' : 'visible'
            }}>
            <button type="button" id="profile-edit-icon" onClick={handleProfileEdit}><img src="/css/img/edit-pen.svg" className="icon"/></button>
          </span>
          <section>
            <label htmlFor="profile-name">Name</label>
            <input type="text" id="profile-name" name="name" 
            disabled={isDisabled}
            value={formData.name}
            onChange={(e) => setFormData({
              ...formData,
              name: e.target.value
            })}/>
          </section>
          <section>
            <label htmlFor="profile-education">Education</label>
            <input type="text" id="profile-education" name="education" 
            disabled={isDisabled}
            value={formData.education}
            onChange={(e) => setFormData({
              ...formData,
              education: e.target.value
            })}/>
          </section>
          <section>
            <label htmlFor="profile-work-exp">Work Experience</label>
            <input type="text" id="profile-work-exp" name="experience" 
            disabled={isDisabled}
            value={formData.experience}
            onChange={(e) => setFormData({
              ...formData,
              experience: e.target.value
            })}/>
          </section>
          <section>
            <label htmlFor="profile-skills">Skills</label>
            <input type="text" id="profile-skills" name="skills" 
            disabled={isDisabled}
            value={formData.skills}
            onChange={(e) => setFormData({
              ...formData,
              skills: e.target.value
            })}/>
          </section>
      </section>
      <section id="buttons-profile-edit" 
      style={{
        visibility: !isHidden ? 'hidden' : 'visible'
      }}>
        <button type="submit" id="profile-save-btn">Save</button>
        <button type="button" id="profile-cancel-btn" onClick={handleProfileEdit}>Cancel</button>
      </section>
    </section>
  </form>
  );
}