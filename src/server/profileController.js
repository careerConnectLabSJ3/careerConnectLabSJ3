const { User } = require('./models/user');
const { Types } = require('mongoose');
const { Readable } = require('stream');
const path = require('path');


async function getProfilePic(req, res){
    try {
        if (!req.session.user) {
            return res.status(401).send('Unauthorized');
        }

        const user = await User.findOne({ email: req.session.user.email });

        // If user has no custom profile picture, serve the default static image
        if (!user || !user.profileImageId) {
            return res.sendFile(path.join(__dirname, '..', 'css', 'img', 'default-pfp.png'));
        }

        // Creates an id for the picture in Mongo
        const fileId = new Types.ObjectId(user.profileImageId);
        const files = await gfsBucket.find({ _id: fileId }).toArray();

        // If no new img is found from form POST, display default pfp
        if (!files || files.length === 0) {
            return res.sendFile(path.join(__dirname, '..', 'css', 'img', 'default-pfp.png'));
        }

        // image is downloaded
        const contentType = files[0].contentType || 'image/jpeg';
        res.setHeader('ContentType', contentType);
        const downloadStream = gfsBucket.openDownloadStream(fileId);
        downloadStream.pipe(res);

    } catch (err) {
        console.error("Avatar route catch error:", err)
        res.status(500).send('Error retrieving image');
    }
};


async function updateProfile(req, res){
    try{
        const currUserInfo = req.session.user;
        if(!currUserInfo){
            return res.status(401).redirect('/login');
        }

        const { name, education, workExp, skills } = req.body;

        // pattern allows [a-z] [A-Z] [0-9] space apostrophe hyphen and curly apostrophe
        const symbolPattern = /[^a-zA-Z0-9\s'\-\u2019]/;
        const fieldsToValidate = [name, education, workExp, skills];

        for (let value of fieldsToValidate) {
            const normalized = String(value || '').trim();
            if (symbolPattern.test(normalized)) {
                return res.status(400).json({ 
                    error: "Validation failed: Only letters, numbers, spaces, apostrophes, and dashes are allowed." 
                });
            }
        }

        const user = await User.findOne({ email: currUserInfo.email });
        if(!user) return res.status(404).json({error: "User not found"});
        let newPfpId = user.profileImageId;

        if (req.file) {
            if (user.profileImageId) {
                try {
                    // deleted old pfp
                    await gfsBucket.delete(new mongoose.Types.ObjectId(user.profileImageId));
                } catch (err) {
                    console.log("Old image not found or already deleted");
                }
            }
            // Stream buffer to GridFS
            const uploadPromise = new Promise((resolve, reject) => {
                const readableStream = new Readable();
                readableStream.push(req.file.buffer);
                readableStream.push(null);

                const uploadStream = gfsBucket.openUploadStream(req.file.originalname, {
                    contentType: req.file.mimetype
                });
                const generatedId = uploadStream.id;
                readableStream.pipe(uploadStream);

                uploadStream.on("finish", () => resolve(generatedId));
                uploadStream.on("error", (err) => reject(err));
            });

            newPfpId = await uploadPromise;
        }
        
        // updates with new data if new data found, otherwise same data 
        user.name = name || user.name;
        user.education = education || user.education;
        user.experience = workExp || user.experience;
        user.skills = skills || user.skills;
        user.profileImageId = newPfpId;

        await user.save();

        // Update session data so it reflects immediately
        req.session.user = {
            ...currUserInfo,
            name: user.name,
            education: user.education,
            experience: user.experience,
            skills: user.skills
        };

        res.redirect("/profile");
        
    }
    catch(error){
        console.log(error);
        return res.status(500).json({error : error.message});
    }
}

module.exports = {getProfilePic, updateProfile}