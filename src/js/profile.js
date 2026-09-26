const profileName = document.getElementById("profile-name");
const profileEducation = document.getElementById("profile-education");
const profileWorkExp = document.getElementById("profile-work-exp");
const profileSkills = document.getElementById("profile-skills");

async function loadProfileInfo(){
  fetch('api/user-profile')
            .then(response => response.json())
            .then(user => {
                if (user.name) {
                    
                    function updateField(element, value){
                        if(!element){return}
                            element.value = value;
                    }

                    updateField(profileName, user?.name);
                    updateField(profileEducation, user?.education || "None");
                    updateField(profileWorkExp, user?.experience || "None");
                    updateField(profileSkills, user?.skills || "None");
                    
                }
            })
        .catch(err => console.error("could not fetch user session:", err));
}

const formElement = document.getElementById("profile-form");
const editIconProfile = document.getElementById("profile-edit-icon");
const cancelBtn = document.getElementById("profile-cancel-btn");
const saveBtn = document.getElementById("profile-save-btn");
const inputs = [profileName, profileEducation, profileWorkExp, profileSkills];

editIconProfile.addEventListener("click", async () => {
    inputs.forEach(e => e.disabled = false);
    formElement.classList.add("is-editing");
});

cancelBtn.addEventListener("click", async () => {
    inputs.forEach(e => e.disabled = true);
    formElement.classList.remove("is-editing");
    loadProfileInfo();
});

// Validation for profile inputs and file
const profileForm = document.getElementById("profile-form");
const pfpInput = document.getElementById("pfp-upload");

profileForm.addEventListener("submit", (e) => {
    if (pfpInput.files && pfpInput.files[0]) {
        const file = pfpInput.files[0];
        const maxSizeInBytes = 2 * 1024 * 1024; // 2MB

        if (file.size > maxSizeInBytes) {
            e.preventDefault();
            alert('File size exceeds 2MB limit. Please choose a smaller image.');
            return;
        }
    }
})


loadProfileInfo();