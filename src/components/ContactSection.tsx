import React, { useEffect, useState } from 'react';
import { CheckCircle2, Instagram, Mail, MessageCircle, Send } from 'lucide-react';
import { useStudioData } from '../context/StudioDataContext';
import { isValidEmail } from '../lib/firebase';

interface ContactSectionProps {
  preselectedService: string;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ preselectedService }) => {
  const { contact, services, submitEnquiry } = useStudioData();

  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [serviceRequired, setServiceRequired] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [channelNotice, setChannelNotice] = useState('');

  useEffect(() => {
    if (preselectedService) {
      setServiceRequired(preselectedService);
      setSubmitted(false);
    }
  }, [preselectedService]);

  const serviceOptions = services.filter((s) => s.active).map((s) => s.title);
  if (preselectedService && !serviceOptions.includes(preselectedService)) {
    serviceOptions.unshift(preselectedService);
  }

  const cleanWhatsappDigits = contact.whatsappNumber.replace(/[^\d]/g, '');
  const hasWhatsapp = cleanWhatsappDigits.length >= 7;
  const hasInstagram = Boolean(contact.instagramUrl.trim());
  const hasEmail = isValidEmail(contact.contactEmail);

  const handleChannelPlaceholderClick = (label: string) => {
    setChannelNotice(
      `${label} link is not configured yet. Please submit the enquiry form on the right, or configure live contact details in the Admin Portal.`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (name.trim().length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }
    if (businessName.trim().length < 1) {
      setErrorMsg('Please enter your business or brand name.');
      return;
    }
    if (!isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (whatsapp.trim().length < 5) {
      setErrorMsg('Please enter a valid WhatsApp number with country code.');
      return;
    }
    if (!serviceRequired) {
      setErrorMsg('Please select the service you require.');
      return;
    }
    if (projectDescription.trim().length < 10) {
      setErrorMsg('Please provide at least 10 characters describing your video idea.');
      return;
    }

    setSubmitting(true);
    try {
      await submitEnquiry({
        name,
        businessName,
        email,
        whatsapp,
        serviceRequired,
        projectDescription,
      });
      setSubmitted(true);
      setName('');
      setBusinessName('');
      setEmail('');
      setWhatsapp('');
      setProjectDescription('');
    } catch {
      setErrorMsg('Unable to send enquiry right now. Please try again shortly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="relative py-24 sm:py-28 bg-[#030610]/35 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Direct Channels */}
          <div className="lg:col-span-5">
            <p className="text-xs font-medium tracking-widest uppercase text-orange-400 mb-3">
              Contact Us
            </p>
            <h2
              className="font-display font-bold text-white tracking-tight leading-tight mb-4"
              style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.75rem)', textWrap: 'balance' }}
            >
              Start Your Next AI Video Production
            </h2>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-8">
              Share your vision, product launch timeline, or campaign goals. Our team reviews every
              brief directly and responds with concepts and next steps.
            </p>

            <div className="space-y-3.5 mb-6">
              {/* WhatsApp Contact Button */}
              {hasWhatsapp ? (
                <a
                  href={`https://wa.me/${cleanWhatsappDigits}?text=${encodeURIComponent(
                    'Hello Artificial Animatics, I would like to discuss an AI video production project.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 px-5 py-4 transition-colors"
                >
                  <span className="flex items-center gap-3.5">
                    <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>
                      <span className="block text-sm font-semibold text-white">
                        Chat on WhatsApp
                      </span>
                      <span className="block text-xs text-slate-300">{contact.whatsappNumber}</span>
                    </span>
                  </span>
                  <span className="text-xs font-medium text-emerald-300">Open</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => handleChannelPlaceholderClick('WhatsApp')}
                  className="w-full text-left flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0b101d] hover:border-emerald-400/40 px-5 py-4 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-3.5">
                    <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>
                      <span className="block text-sm font-semibold text-white">
                        WhatsApp Contact
                      </span>
                      <span className="block text-xs text-slate-400">
                        Placeholder — set your studio WhatsApp number in Admin
                      </span>
                    </span>
                  </span>
                  <span className="text-xs text-slate-400">Configure</span>
                </button>
              )}

              {/* Instagram Link */}
              {hasInstagram ? (
                <a
                  href={contact.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0b101d] hover:border-purple-400/40 px-5 py-4 transition-colors"
                >
                  <span className="flex items-center gap-3.5">
                    <Instagram className="w-5 h-5 text-purple-400 shrink-0" />
                    <span>
                      <span className="block text-sm font-semibold text-white">Instagram</span>
                      <span className="block text-xs text-slate-400 truncate max-w-[230px]">
                        {contact.instagramUrl}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs font-medium text-purple-300">Follow</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => handleChannelPlaceholderClick('Instagram')}
                  className="w-full text-left flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0b101d] hover:border-purple-400/40 px-5 py-4 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-3.5">
                    <Instagram className="w-5 h-5 text-purple-400 shrink-0" />
                    <span>
                      <span className="block text-sm font-semibold text-white">Instagram</span>
                      <span className="block text-xs text-slate-400">
                        Placeholder — add your Instagram URL in Admin
                      </span>
                    </span>
                  </span>
                  <span className="text-xs text-slate-400">Configure</span>
                </button>
              )}

              {/* Email Contact Link */}
              {hasEmail ? (
                <a
                  href={`mailto:${contact.contactEmail}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0b101d] hover:border-cyan-400/40 px-5 py-4 transition-colors"
                >
                  <span className="flex items-center gap-3.5">
                    <Mail className="w-5 h-5 text-cyan-400 shrink-0" />
                    <span>
                      <span className="block text-sm font-semibold text-white">Email Studio</span>
                      <span className="block text-xs text-slate-300">{contact.contactEmail}</span>
                    </span>
                  </span>
                  <span className="text-xs font-medium text-cyan-300">Email</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => handleChannelPlaceholderClick('Email')}
                  className="w-full text-left flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0b101d] hover:border-cyan-400/40 px-5 py-4 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-3.5">
                    <Mail className="w-5 h-5 text-cyan-400 shrink-0" />
                    <span>
                      <span className="block text-sm font-semibold text-white">Email Contact</span>
                      <span className="block text-xs text-slate-400">
                        Placeholder — add your business email in Admin
                      </span>
                    </span>
                  </span>
                  <span className="text-xs text-slate-400">Configure</span>
                </button>
              )}
            </div>

            {channelNotice && (
              <p className="text-xs text-cyan-300 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 leading-relaxed">
                {channelNotice}
              </p>
            )}
          </div>

          {/* Right Column: Validated Backend Contact Form */}
          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#0b101d]/80 backdrop-blur-md p-6 sm:p-8">
            {submitted ? (
              <div className="py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white mb-3">
                  Project Brief Received
                </h3>
                <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto mb-7">
                  Thank you for contacting Artificial Animatics. Your enquiry has been saved and
                  our production team will reach out shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white border border-white/15 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Submit Another Enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-medium text-slate-300 mb-2"
                    >
                      Name *
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      maxLength={120}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-white/10 bg-[#060913] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-business"
                      className="block text-xs font-medium text-slate-300 mb-2"
                    >
                      Business Name *
                    </label>
                    <input
                      id="contact-business"
                      type="text"
                      required
                      maxLength={140}
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Company or brand name"
                      className="w-full rounded-xl border border-white/10 bg-[#060913] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-xs font-medium text-slate-300 mb-2"
                    >
                      Email Address *
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      maxLength={160}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-xl border border-white/10 bg-[#060913] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-whatsapp"
                      className="block text-xs font-medium text-slate-300 mb-2"
                    >
                      WhatsApp Number *
                    </label>
                    <input
                      id="contact-whatsapp"
                      type="tel"
                      required
                      maxLength={30}
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+1 555 0100"
                      className="w-full rounded-xl border border-white/10 bg-[#060913] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-service"
                    className="block text-xs font-medium text-slate-300 mb-2"
                  >
                    Service Required *
                  </label>
                  <select
                    id="contact-service"
                    required
                    value={serviceRequired}
                    onChange={(e) => setServiceRequired(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#060913] px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors"
                  >
                    <option value="">Select a video production service</option>
                    {serviceOptions.map((srv) => (
                      <option key={srv} value={srv}>
                        {srv}
                      </option>
                    ))}
                    <option value="Starter Package">Starter Package</option>
                    <option value="Professional Package">Professional Package</option>
                    <option value="Premium Package">Premium Package</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="contact-description"
                    className="block text-xs font-medium text-slate-300 mb-2"
                  >
                    Project Description *
                  </label>
                  <textarea
                    id="contact-description"
                    required
                    rows={4}
                    maxLength={3000}
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Describe your product, target platform, preferred style, or timeline..."
                    className="w-full rounded-xl border border-white/10 bg-[#060913] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors resize-y"
                  />
                </div>

                {errorMsg && (
                  <p
                    role="alert"
                    className="text-xs text-rose-300 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5"
                  >
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 hover:brightness-110 disabled:opacity-60 transition-all duration-200 shadow-[0_0_24px_rgba(37,99,235,0.4)] cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Sending Project Brief...' : 'Send Project Brief'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
