import { useEffect, useState } from "react";


export default function Profile(){

  const [error, setError] = useState('');
  const [isDisabled, setIsDisabled] = useState(true);
  const [isHidden, setIsHidden] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    education: "",
    experience: "",
    skills: ""
  });

  async function handleProfileUpdate(){
    try{
      const res = await fetch('/api/user-profile');
      const data = await res.json();
      setFormData(data);
    }
    catch(e){
      console.error(e.message);
      setError(e.message);
    }
  }

  function handleProfileEdit(){
    try{
      isDisabled ? setIsDisabled(false) : setIsDisabled(true);
      isHidden ? setIsHidden(false) : setIsHidden(true)
    }
    catch(e){
      console.error(e.message);
      setError(e.message);
    }
  }

  useEffect(() => {
    handleProfileUpdate();
  }, [])
  
  return(
    <form id="profile-form" encType="multipart/form-data" onSubmit={handleProfileUpdate}>
      <section className="profile-main">
        <img src="/api/profile/avatar" alt="Profile Picture" id="profile-img"/>
        <input type="file" id="pfp-upload" name="pfpUpload" className="hidden" accept="image/png, image/jpeg"/>
        <section className="profile-main-info">
          <span className="right-align">
            <button type="button" id="profile-edit-icon" onClick={handleProfileEdit}><img src="/css/img/edit-pen.svg" className="icon"
            hidden={isHidden}/></button>
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
            <input type="text" id="profile-work-exp" name="workExp" 
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
      <section id="buttons-profile-edit" className="hidden">
        <button type="submit" id="profile-save-btn">Save</button>
        <button type="button" id="profile-cancel-btn">Cancel</button>
      </section>
    </section>
  </form>
  );
}