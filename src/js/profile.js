async function loadProfileInfo(){
  fetch('api/current-user')
            .then(response => response.json())
            .then(user => {
                if (user.name) {
                    const profileName = document.getElementById("profile-name");
                    const profileEducation = document.getElementById("profile-education");
                    const profileWorkExp = document.getElementById("profile-work-exp");
                    const profileSkills = document.getElementById("profile-skills");
                    
                    function updateField(element, value){
                        if(!element){return}
                        if(element.tagName === "p"){
                            return element.innerText = value;
                        }
                        else{
                            element.value = value;
                        }
                    }

                    updateField(profileName, user.name);
                    updateField(profileEducation, user?.education || "None");
                    updateField(profileWorkExp, user?.work || "None");
                    updateField(profileSkills, user?.skills || "None");
                    
                }
            })
        .catch(err => console.error("could not fetch user session:", err));
}

function editProfile(){

}

loadProfileInfo();