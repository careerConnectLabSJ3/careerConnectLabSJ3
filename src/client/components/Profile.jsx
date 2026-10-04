import { useState } from "react";


export default function Profile(){

  const [error, setError] = useState('');

  async function handleProfileUpdate(){

  }
  
  return(
    <form action="/profile" method="POST" id="profile-form" enctype="multipart/form-data">
      <section className="profile-main">
        <img src="/api/profile/avatar" alt="Profile Picture" id="profile-img"/>
        <input type="file" id="pfp-upload" name="pfpUpload" className="hidden" accept="image/png, image/jpeg"/>
        <section className="profile-main-info">
          <span className="right-align">
            <button type="button" id="profile-edit-icon"><img src="/css/img/edit-pen.svg" className="icon"/></button>
          </span>
          <section>
            <label for="profile-name">Name</label>
            <input type="text" id="profile-name" name="name" value="" disabled/>
          </section>
          <section>
            <label for="profile-education">Education</label>
            <input type="text" id="profile-education" name="education" value="" disabled/>
          </section>
          <section>
            <label for="profile-work-exp">Work Experience</label>
            <input type="text" id="profile-work-exp" name="workExp" value="" disabled/>
          </section>
          <section>
            <label for="profile-skills">Skills</label>
            <input type="text" id="profile-skills" name="skills" value="" disabled/>
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