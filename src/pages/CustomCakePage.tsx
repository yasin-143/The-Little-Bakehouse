import { useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { validateCustomCakeInput } from '../lib/pricing';
import { uploadImageToStorage, validateImageFile } from '../lib/storageUpload';
import type { CustomCakeRequest } from '../types/bakery';

const FLAVOURS = [
  'Belgian Chocolate Truffle',
  'Chocolate Chips',
  'Oreo Crunch',
  'Black Forest',
  'White Forest',
  'Pineapple Cream',
  'Strawberry Berry',
  'Blueberry Compote',
  'Butterscotch Caramel',
  'Red Velvet Cream Cheese',
];

const WEIGHTS = ['500g', '1kg', '1.5kg', '2kg (Two-Tier)', '3kg+ (Multi-Tier)'];

export function CustomCakePage() {
  const { user, signInWithGoogle, getIdToken } = useAuth();

  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [occasion, setOccasion] = useState('');
  const [preferredFlavour, setPreferredFlavour] = useState(FLAVOURS[0]);
  const [weight, setWeight] = useState('1kg');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [designDescription, setDesignDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedRequest, setConfirmedRequest] = useState<CustomCakeRequest | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    const err = validateImageFile(file);
    if (err) {
      setFieldErrors((prev) => ({ ...prev, referenceImage: err }));
      return;
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.referenceImage;
      return next;
    });
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const submitRequest = async (tokenOverride?: string | null) => {
    setSubmitError(null);
    const validation = validateCustomCakeInput({
      customerName,
      phone,
      occasion,
      preferredFlavour,
      weight,
      designDescription,
      deliveryDate,
    });
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    try {
      let referenceImageUrl = manualImageUrl.trim() || undefined;
      if (selectedFile) {
        referenceImageUrl = await uploadImageToStorage(
          selectedFile,
          'custom-requests',
          user?.uid
        );
      }

      const token = tokenOverride ?? (await getIdToken());
      const res = await fetch('/api/custom-cakes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customerName,
          phone,
          occasion,
          preferredFlavour,
          weight,
          designDescription,
          deliveryDate,
          referenceImageUrl,
        }),
      });

      const data = (await res.json()) as {
        code?: string;
        error?: string;
        fieldErrors?: Record<string, string>;
        request?: CustomCakeRequest;
      };

      if (res.status === 401 && data.code === 'SIGN_IN_REQUIRED') {
        setNeedsSignIn(true);
        setSubmitError(data.error || 'Please sign in with Google to submit your custom cake request.');
        return;
      }

      if (!res.ok || !data.request) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setSubmitError(data.error || 'Failed to submit custom cake request.');
        return;
      }

      setConfirmedRequest(data.request);
      setNeedsSignIn(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to submit custom cake request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitRequest();
  };

  const handleSignInAndSubmit = async () => {
    try {
      const signedIn = await signInWithGoogle();
      const freshToken = await signedIn.getIdToken();
      await submitRequest(freshToken);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    }
  };

  if (confirmedRequest) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-[#765447]/15 p-8 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#F6DDE2] flex items-center justify-center text-[#765447]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-[#9B4D3E] font-medium">
              Custom Cake Request Received
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#4A332B]">
              Thank you, {confirmedRequest.customerName}!
            </h1>
            <p className="text-sm text-[#765447]">
              Request ID:{' '}
              <span className="font-mono-num font-semibold text-[#4A332B]">
                {confirmedRequest.requestId}
              </span>
            </p>
          </div>

          <div className="bg-[#FFF5E9] rounded-xl p-5 text-left text-sm space-y-2 border border-[#765447]/10">
            <p>
              <span className="text-[#765447]">Occasion:</span>{' '}
              <strong className="text-[#4A332B]">{confirmedRequest.occasion}</strong>
            </p>
            <p>
              <span className="text-[#765447]">Flavour &amp; Weight:</span>{' '}
              <strong className="text-[#4A332B]">
                {confirmedRequest.preferredFlavour} ({confirmedRequest.weight})
              </strong>
            </p>
            <p>
              <span className="text-[#765447]">Target Date:</span>{' '}
              <strong className="text-[#4A332B]">{confirmedRequest.deliveryDate}</strong>
            </p>
          </div>

          <p className="text-sm text-[#765447]">
            Muskan will review your design brief in her dashboard and reach out on{' '}
            <span className="font-mono-num">{confirmedRequest.phone}</span> with a personalized
            quotation.
          </p>

          <button
            type="button"
            onClick={() => {
              setConfirmedRequest(null);
              setDesignDescription('');
              setSelectedFile(null);
              setPreviewUrl(null);
            }}
            className="px-5 py-2.5 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium cursor-pointer"
          >
            Submit Another Request
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-[#9B4D3E]">
          Bespoke Theme Cakes · 100% Eggless
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#4A332B]">
          Custom Cake Request
        </h1>
        <p className="text-base text-[#765447] max-w-2xl">
          Planning a milestone birthday, baby shower, or anniversary in Pune? Share your theme,
          preferred flavour, and an optional reference photo—Muskan will reply with a custom quote.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-[#765447]/15 p-6 sm:p-8 space-y-6"
      >
        {submitError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 space-y-3">
            <p>{submitError}</p>
            {needsSignIn && (
              <button
                type="button"
                onClick={handleSignInAndSubmit}
                className="px-4 py-2 rounded-lg bg-[#765447] text-[#FFF5E9] text-xs font-medium cursor-pointer"
              >
                Sign in with Google &amp; Submit Request
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label htmlFor="cc-name" className="block text-xs font-semibold text-[#4A332B]">
              Customer Name *
            </label>
            <input
              id="cc-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm text-[#4A332B]"
            />
            {fieldErrors.customerName && (
              <p className="text-xs text-red-700">{fieldErrors.customerName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cc-phone" className="block text-xs font-semibold text-[#4A332B]">
              Phone / WhatsApp Number *
            </label>
            <input
              id="cc-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm text-[#4A332B]"
            />
            {fieldErrors.phone && <p className="text-xs text-red-700">{fieldErrors.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cc-occasion" className="block text-xs font-semibold text-[#4A332B]">
              Occasion *
            </label>
            <input
              id="cc-occasion"
              type="text"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="e.g., 1st Birthday, Anniversary, Engagement"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm text-[#4A332B]"
            />
            {fieldErrors.occasion && <p className="text-xs text-red-700">{fieldErrors.occasion}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cc-date" className="block text-xs font-semibold text-[#4A332B]">
              Required Delivery / Pickup Date *
            </label>
            <input
              id="cc-date"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm text-[#4A332B]"
            />
            {fieldErrors.deliveryDate && (
              <p className="text-xs text-red-700">{fieldErrors.deliveryDate}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cc-flavour" className="block text-xs font-semibold text-[#4A332B]">
              Preferred Flavour *
            </label>
            <select
              id="cc-flavour"
              value={preferredFlavour}
              onChange={(e) => setPreferredFlavour(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm text-[#4A332B]"
            >
              {FLAVOURS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cc-weight" className="block text-xs font-semibold text-[#4A332B]">
              Cake Weight *
            </label>
            <select
              id="cc-weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm text-[#4A332B]"
            >
              {WEIGHTS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cc-desc" className="block text-xs font-semibold text-[#4A332B]">
            Design Description, Colors &amp; Cake Message *
          </label>
          <textarea
            id="cc-desc"
            rows={4}
            value={designDescription}
            onChange={(e) => setDesignDescription(e.target.value)}
            placeholder="Describe theme, color palette, fondant/buttercream toppers, and text on the cake..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm text-[#4A332B]"
          />
          {fieldErrors.designDescription && (
            <p className="text-xs text-red-700">{fieldErrors.designDescription}</p>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[#4A332B]">
            Reference Image Upload (Optional · JPG, PNG, WebP up to 5 MB)
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[#765447]/40 bg-[#FFF5E9]/50 text-sm text-[#4A332B] hover:bg-[#F6DDE2]/40 cursor-pointer">
              <ImagePlus className="w-4 h-4 text-[#765447]" />
              <span>{selectedFile ? selectedFile.name : 'Choose Reference Photo'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Reference preview"
                className="w-16 h-16 rounded-lg object-cover border border-[#765447]/20"
              />
            )}
          </div>
          {fieldErrors.referenceImage && (
            <p className="text-xs text-red-700">{fieldErrors.referenceImage}</p>
          )}
          <input
            type="url"
            value={manualImageUrl}
            onChange={(e) => setManualImageUrl(e.target.value)}
            placeholder="Or paste an image URL if preferred (optional)"
            className="w-full px-3.5 py-2 rounded-lg border border-[#765447]/20 bg-[#FFF5E9]/30 text-xs text-[#4A332B]"
          />
        </div>

        <div className="pt-2 flex items-center justify-between gap-4">
          <p className="text-xs text-[#765447]">
            Custom cakes require 24–48 hours notice depending on complexity.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium hover:bg-[#5E4136] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{submitting ? 'Submitting Request...' : 'Submit Custom Cake Request'}</span>
          </button>
        </div>
      </form>
    </main>
  );
}
