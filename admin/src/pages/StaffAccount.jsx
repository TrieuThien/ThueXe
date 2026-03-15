import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { createStaffAccount, getMe } from "../services/authService";

const initialForm = {
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "dispatcher",
};

const phoneRegex = /^\+?\d{8,15}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientErrors(form) {
    const errors = {};
    const firstname = form.firstname.trim();
    const lastname = form.lastname.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const password = String(form.password || "");

    if (firstname.length < 2 || firstname.length > 64) {
        errors.firstname = "Firstname must be between 2 and 64 characters.";
    }

    if (lastname.length < 2 || lastname.length > 64) {
        errors.lastname = "Lastname must be between 2 and 64 characters.";
    }

    if (!email && !phone) {
        errors.identifier = "Email or phone is required.";
    }

    if (email && !emailRegex.test(email)) {
        errors.email = "Invalid email format.";
    }

    if (phone && !phoneRegex.test(phone)) {
        errors.phone = "Invalid phone number format.";
    }

    if (password.length < 10 || password.length > 128) {
        errors.password = "Password must be between 10 and 128 characters.";
    } else {
        if (!/[A-Z]/.test(password)) {
            errors.password = "Password must include at least one uppercase letter.";
        } else if (!/[a-z]/.test(password)) {
            errors.password = "Password must include at least one lowercase letter.";
        } else if (!/\d/.test(password)) {
            errors.password = "Password must include at least one number.";
        } else if (!/[^A-Za-z0-9]/.test(password)) {
            errors.password = "Password must include at least one special character.";
        }
    }

    if (form.confirmPassword !== password) {
        errors.confirmPassword = "Confirm password does not match.";
    }

    if (!["admin", "dispatcher"].includes(form.role)) {
        errors.role = "Role must be admin or dispatcher.";
    }

    return errors;
}

function mapApiValidationErrors(details = []) {
    const fieldErrors = {};

    details.forEach((item) => {
        const key = item?.path;
        const message = item?.msg;

        if (key && message && !fieldErrors[key]) {
            fieldErrors[key] = message;
        }
    });

    return fieldErrors;
}

export default function StaffAccountPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState(initialForm);
    const [fieldErrors, setFieldErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [authChecking, setAuthChecking] = useState(true);

    useEffect(() => {
        let mounted = true;

        getMe()
            .then((res) => {
                const role = res?.user?.role;

                if (!mounted) return;

                if (role !== "admin") {
                    navigate("/admin/dashboard", { replace: true });
                    return;
                }

                setAuthChecking(false);
            })
            .catch(() => {
                if (!mounted) return;
                navigate("/login", { replace: true });
            });

        return () => {
            mounted = false;
        };
    }, [navigate]);

    const clientErrors = useMemo(() => getClientErrors(form), [form]);
    const submitDisabled = authChecking || loading || Object.keys(clientErrors).length > 0;

    const setFormField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setFieldErrors((prev) => ({ ...prev, [key]: "", identifier: "" }));
        setSubmitError("");
    };

    const submitForm = async (event) => {
        event.preventDefault();
        setSubmitAttempted(true);
        setSuccessMessage("");

        const nextErrors = getClientErrors(form);
        setFieldErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            setSubmitError("Please fix validation errors before submitting.");
            return;
        }

        setLoading(true);
        setSubmitError("");

        try {
            await createStaffAccount({
                firstname: form.firstname.trim(),
                lastname: form.lastname.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                password: form.password,
                role: form.role,
            });

            setSuccessMessage("Staff account created successfully.");
            setForm(initialForm);
            setFieldErrors({});
            setTouched({});
            setSubmitAttempted(false);
        } catch (error) {
            const status = error?.response?.status;
            const data = error?.response?.data || {};

            if (status === 422) {
                const apiFieldErrors = mapApiValidationErrors(data.details);
                setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
                setSubmitError(data.message || "Validation failed.");
            } else if (status === 409) {
                setSubmitError(data.message || "Email or phone is already in use.");
            } else if (status === 401 || status === 403) {
                setSubmitError("You do not have permission to create staff accounts.");
            } else {
                setSubmitError(data.message || "Unable to create staff account. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (authChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex items-center gap-2 text-gray-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Checking permissions...
                </div>
            </div>
        );
    }

    const showError = (name) => touched[name] || submitAttempted;

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6 flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            Create Staff Account
                        </h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Admin can create accounts with role admin or dispatcher.
                        </p>
                    </div>
                    <Link
                        to="/admin/dashboard"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Link>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-6 lg:p-8">
                    <form onSubmit={submitForm} className="space-y-5">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Firstname
                                </label>
                                <input
                                    type="text"
                                    value={form.firstname}
                                    onChange={(e) => setFormField("firstname", e.target.value)}
                                    onBlur={() => setTouched((prev) => ({ ...prev, firstname: true }))}
                                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                                    placeholder="Nguyen"
                                />
                                {showError("firstname") && fieldErrors.firstname && (
                                    <p className="mt-1.5 text-xs text-red-500">{fieldErrors.firstname}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Lastname
                                </label>
                                <input
                                    type="text"
                                    value={form.lastname}
                                    onChange={(e) => setFormField("lastname", e.target.value)}
                                    onBlur={() => setTouched((prev) => ({ ...prev, lastname: true }))}
                                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                                    placeholder="Van A"
                                />
                                {showError("lastname") && fieldErrors.lastname && (
                                    <p className="mt-1.5 text-xs text-red-500">{fieldErrors.lastname}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setFormField("email", e.target.value)}
                                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                                    placeholder="staff@example.com"
                                />
                                {showError("email") && fieldErrors.email && (
                                    <p className="mt-1.5 text-xs text-red-500">{fieldErrors.email}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Phone
                                </label>
                                <input
                                    type="text"
                                    value={form.phone}
                                    onChange={(e) => setFormField("phone", e.target.value)}
                                    onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                                    placeholder="+84901234567"
                                />
                                {showError("phone") && fieldErrors.phone && (
                                    <p className="mt-1.5 text-xs text-red-500">{fieldErrors.phone}</p>
                                )}
                            </div>
                        </div>

                        {fieldErrors.identifier && (
                            <p className="text-xs text-red-500">{fieldErrors.identifier}</p>
                        )}

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setFormField("password", e.target.value)}
                                    onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                                    placeholder="At least 10 chars, mixed symbols"
                                />
                                {showError("password") && fieldErrors.password && (
                                    <p className="mt-1.5 text-xs text-red-500">{fieldErrors.password}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={form.confirmPassword}
                                    onChange={(e) => setFormField("confirmPassword", e.target.value)}
                                    onBlur={() =>
                                        setTouched((prev) => ({ ...prev, confirmPassword: true }))
                                    }
                                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                                    placeholder="Repeat password"
                                />
                                {showError("confirmPassword") && fieldErrors.confirmPassword && (
                                    <p className="mt-1.5 text-xs text-red-500">{fieldErrors.confirmPassword}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Role
                            </label>
                            <select
                                value={form.role}
                                onChange={(e) => setFormField("role", e.target.value)}
                                onBlur={() => setTouched((prev) => ({ ...prev, role: true }))}
                                className="w-full sm:w-72 px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                            >
                                <option value="dispatcher">Dispatcher</option>
                                <option value="admin">Admin</option>
                            </select>
                            {showError("role") && fieldErrors.role && (
                                <p className="mt-1.5 text-xs text-red-500">{fieldErrors.role}</p>
                            )}
                        </div>

                        {submitError && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {submitError}
                            </div>
                        )}

                        {successMessage && (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" />
                                {successMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitDisabled}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Staff Account"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
