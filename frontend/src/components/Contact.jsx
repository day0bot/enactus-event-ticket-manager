import "../stylesheets/Contact.css";
import Swal from "sweetalert2";
function Contact() {
  const onSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);

    formData.append("access_key", "c092c8e2-c53b-4078-9ee1-e7b0b02cfca0");

    const object = Object.fromEntries(formData);
    const json = JSON.stringify(object);

    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: json,
    }).then((res) => res.json());

    if (res.success) {
      Swal.fire({
        title: "thanks for your feedback",
        text: "Message sent successfully",
        icon: "success",
      });
    }
  };
  return (
    <section className="contact">
      <form onSubmit={onSubmit}>
        <h2>Contact Us</h2>
        <div className="input-box">
          <label>Full Name</label>
          <input
            className="field"
            type="text"
            placeholder="Enter your name"
            name="name"
            required
          />
        </div>
        <div className="input-box">
          <label>Email Address</label>
          <input
            className="field"
            type="email"
            placeholder="Enter your Email"
            name="email"
            required
          />
        </div>
        <div className="input-box">
          <label>Enter your Message</label>
          <textarea
            className="field mess"
            placeholder="Enter your message"
            name="message"
            required
          ></textarea>
        </div>

        <button type="submit" className="submit">
          Send Message
        </button>
      </form>
    </section>
  );
}

export default Contact;
