async function loadProfileInfo(){
  fetch('api/current-user')
            .then(response => response.json())
            .then(user => {
                if (user.name) {
                    const profileName = document.getElementById("profile-name");
                    const profileEducation = document.getElementById("profile-education");
                    const profileWorkExp = document.getElementById("profile-work-exp");
                    const profileSkills = document.getElementById("profile-skills");
                    

                    if(profileName.tagName == "p"){
                        profileName.innerText = user.name;
                        profileEducation.innerText = user?.education || "None";
                        profileWorkExp.innerText = user?.work || "None";
                        profileSkills.innerText = user?.skills || "None";
                    }
                    else{
                        profileName.value = user.name;
                        profileEducation.value = user?.education || "None";
                        profileWorkExp.value = user?.work || "None";
                        profileSkills.value = user?.skills || "None";
                    }

                    
                }
            })
        .catch(err => console.error("could not fetch user session:", err));
}

function editProfile(){

}

loadProfileInfo();