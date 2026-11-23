export const metadata = { title: "Privacy Policy (draft) · AI Time Machine" };

export default function PrivacyPage() {
  return (
    <main className="page prose">
      <p className="draft">Draft. This is not a finished legal policy. Replace it with a lawyer-approved privacy policy before you take real payments.</p>
      <h1>Privacy Policy</h1>
      <p>AI Time Machine (adiology.io) stores the details you give us so the product can work.</p>
      <ul>
        <li>Your phone number, from the payment, so we can text you a link.</li>
        <li>The email you add, so we can send a one-time code and a welcome note.</li>
        <li>Your business name, what you sell, and the goal you pick.</li>
        <li>A record of the payment from Cashfree, Razorpay or PayU. We do not store your card or UPI pin.</li>
        <li>Messages you type to an agent, and the yes or no you give.</li>
      </ul>
      <p>We use this to run your account. We do not sell it. Payment companies, the email sender, and the text sender only get what they need to do their job.</p>
      <p>
        To ask about your data, write to <a href="mailto:support@adiology.io">support@adiology.io</a>.
      </p>
    </main>
  );
}
