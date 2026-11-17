

// Checks if given file is a PDF
export function isPdf(file) {
    const hasPdfHeader = file?.buffer?.subarray(0, 5).toString() === '%PDF-';
    const hasPdfEndMarker = file?.buffer?.lastIndexOf(Buffer.from('%%EOF')) !== -1;

    return file &&
        file.mimetype === 'application/pdf' &&
        file.originalname.toLowerCase().endsWith('.pdf') &&
        hasPdfHeader &&
        hasPdfEndMarker;
}

// Converts file name to safe file name
export function convertToSafeFilename(filename) {
    return String(filename || 'resume.pdf').replace(/[\\/\r\n"]/g, '_');
}


// Check for correct user from its role
export function checkCorrectUser(req, res, role){
  if (!req.session?.user) {
    res.status(401).json({ error: 'Please log in to continue.' });
    return false;
  }
  if (req.session.user.role !== role) {
    res.status(403).json({ error: 'Your account cannot perform this action.' });
    return false;
  }
  return true;
}