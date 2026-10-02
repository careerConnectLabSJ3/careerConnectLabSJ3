import '../css/login.css';


export default function Login(){
  return(
    <section class="auth-container">
      <div class="auth-card">
        <h2>Welcome Back</h2>
        <p class="auth-subtitle">Log in to manage your job search activities</p>

        <form action="/login" method="POST" class="auth-form">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input type="email" id="email" name="email" placeholder="Enter your email" required/>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Enter your password" required/>
          </div>

          <button type="submit" class="btn-primary">Log In</button>
        </form>

        <p class="auth-redirect">Don't have an account? <a href="/register">Register here</a></p>
      </div>
    </section>
  );
}