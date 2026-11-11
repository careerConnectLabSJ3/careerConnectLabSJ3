

export function checkSession(req, res){
    if(req.session.user){
        return res.json({
            loggedIn: true,
            user: req.session.user
        });
    }
    return res.json({
        loggedIn: false
    });
}


export function fetchCurrentUser(req, res){
    if (req.session.user) {
        res.json({
            name: req.session.user.name,
            role: req.session.user.role
        });
    }
}


export async function checkEmail(req, res){
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email.includes('@')) return res.json({ available: false });
    try {
        const existingUser = await User.exists({ email });
        return res.json({ available: !existingUser });
    } catch (error) {
        console.error('Email availability check failed:', error);
        return res.status(500).json({ available: false });
    }
}


export async function registerUser(req, res){
    try {
        const { normalizedName, normalizedEmail, password, role } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            role
        });

        await newUser.save();
        return res.status(200).json({
            message: 'Registration successful'
        });
    
    } catch (error) {
        console.error(error);
        if (error && error.code === 11000) {
            return sendRegistrationError(res, 409, 'This email address is already registered. Please use a different email address.');
        }
        return res.status(500).send('Server error during registration');
    }
}


export async function loginUser(req, res){
    try {
        const { email, password } = req.body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (!normalizedEmail || typeof password !== 'string' || !password) {
            return res.status(400).send('Email and password are required.');
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user || !await bcrypt.compare(password, user.password)) {
            return sendLoginError(res, 'Invalid email or password. Please try again.');
        }

        if (user.role !== 'job_seeker' && user.role !== 'recruiter') {
            return res.status(403).send('This account does not have a valid role.');
        }

        req.session.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            education: user.education,
            experience: user.experience,
            skills: user.skills
        };

        return res.status(200).json({
            message: 'Login successful',
            role: user.role
        });
    
    } catch (error) {
        console.error('Login failed:', error);
        return res.status(500).send('Server error during login.');
    }
}


export function logoutUser(req, res){
    req.session.destroy((err) => {
        if (err) {
            console.log('Logout failed:', err);
            return res.status(500).json({
                loggedIn: true,
                message: 'Logout failed'
            });
        }
        res.clearCookie('connect.sid');
        return res.status(200).json({
            loggedIn: true,
            message: 'Logout successful'
        });
    });
}