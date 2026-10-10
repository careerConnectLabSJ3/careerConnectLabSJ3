import { Link } from "react-router-dom";


const applications = [
  { title: 'Frontend Developer', status: 'Applied', className: '' },
  { title: 'Software Engineer Intern', status: 'Interview', className: 'interview' },
  { title: 'Junior Web Developer', status: 'Offered', className: 'offer' },
  { title: 'QA Analyst', status: 'Rejected', className: 'rejected' },
];

const features = [
  ['Professional Profile', 'Showcase your education, skills, and work experience in one place.'],
  ['Résumé Upload', 'Store and manage multiple versions of your résumé securely.'],
  ['Job Search', 'Discover jobs that match your interests, skills, and qualifications.'],
  ['Track Applications', "Monitor each application's status: Applied, Interview, Offered, or Rejected."],
  ['Deadline Reminders', 'Get notified about upcoming application deadlines so you never miss one.'],
  ['Saved Jobs', 'Bookmark interesting positions and revisit them whenever you\'re ready.'],
];

export default function Welcome(){
  return (
    <>
      <Hero />
      <Features />
      <UserTypes />
      <Workflow />
      <Roadmap />
      <AboutProject />
    </>
  );
}


function Hero() {
  return (
    <section className="hero">
      <div>
        <h1>CareerConnect: Connecting Job Seekers and Recruiters</h1>
        <p>
          CareerConnect is a platform that connects Job Seekers and Recruiters through secure
          authentication, profile management, application tracking, and recruitment workflows.
          It helps job seekers build professional profiles, upload résumés, search for
          opportunities, and track every application — from submission to offer.
        </p>
        <div className="hero-actions">
          <Link to="/register" className="btn btn-primary">Get started</Link>
          <Link to="/login" className="btn btn-ghost">I already have an account</Link>
        </div>
      </div>

      <aside className="hero-card" aria-label="Application status preview">
        <h3>Your applications</h3>
        <ul className="status-list">
          {applications.map((application) => (
            <li key={application.title}>
              {application.title}
              <span className={`pill ${application.className}`}>{application.status}</span>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}

function Features() {
  return (
    <section className="features" id="features">
      <h2>Key features</h2>
      <p>Everything you need to stay organized throughout your job search.</p>
      <div className="feature-grid">
        {features.map(([title, description]) => (
          <article className="feature" key={title}>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function UserTypes() {
  return (
    <section className="user-types">
      <h2>Who is CareerConnect For?</h2>
      <div className="cards">
        <div className="card">
          <h3>Job Seekers</h3>
          <p>Create profiles, upload résumés, search jobs, and track applications.</p>
        </div>
        <div className="card">
          <h3>Recruiters</h3>
          <p>Manage candidates, review applications, and streamline hiring.</p>
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    'Create an account',
    'Select Job Seeker or Recruiter',
    'Complete your profile',
    'Apply for jobs or manage candidates',
    'Track progress through your dashboard',
  ];

  return (
    <section className="workflow">
      <h2>How It Works</h2>
      <ol>
        {steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
    </section>
  );
}

function Roadmap() {
  const upcomingFeatures = [
    'AI-powered job recommendations',
    'Application analytics dashboard',
    'Recruiter candidate ranking',
    'Email notifications',
    'Interview scheduling system',
  ];

  return (
    <section className="roadmap">
      <h2>Upcoming Features</h2>
      <ul>
        {upcomingFeatures.map((feature) => <li key={feature}>{feature}</li>)}
      </ul>
    </section>
  );
}

function AboutProject() {
  return (
    <section className="about-project">
      <h2>About the Project</h2>
      <p>
        CareerConnect is a SOEN341 software engineering project that aims to simplify the
        recruitment process by creating a centralized platform for job seekers and recruiters.
      </p>
    </section>
  );
}