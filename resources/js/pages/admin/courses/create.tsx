import React from 'react';
import { useForm } from '@inertiajs/react';

interface CourseFormData {
    id: number | null;
    title: string;
    description: string;
    pole: string;
    languages: string[];
    status: string;
}

interface CreateCoursePageProps {
    form: CourseFormData;
}

export default function CreateCoursePage({ form: initialData }: CreateCoursePageProps) {
    const { data, setData, post, processing, errors } = useForm<CourseFormData>(initialData);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/courses');
    };

    const handleLanguageChange = (lang: string) => {
        const newLanguages = data.languages.includes(lang)
            ? data.languages.filter(l => l !== lang)
            : [...data.languages, lang];
        setData('languages', newLanguages);
    };

    return (
        <main className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Créer un nouveau cours</h1>
            
            <form onSubmit={submit} className="space-y-6" noValidate>
                <fieldset className="space-y-4">
                    <legend className="sr-only">Informations générales du cours</legend>
                    
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titre</label>
                        <input
                            id="title"
                            type="text"
                            value={data.title}
                            onChange={e => setData('title', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            aria-invalid={!!errors.title}
                            aria-describedby={errors.title ? "title-error" : undefined}
                            required
                        />
                        {errors.title && <p id="title-error" className="mt-2 text-sm text-red-600">{errors.title}</p>}
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            id="description"
                            value={data.description}
                            onChange={e => setData('description', e.target.value)}
                            rows={4}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            aria-invalid={!!errors.description}
                            aria-describedby={errors.description ? "description-error" : undefined}
                            required
                        />
                        {errors.description && <p id="description-error" className="mt-2 text-sm text-red-600">{errors.description}</p>}
                    </div>

                    <div>
                        <label htmlFor="pole" className="block text-sm font-medium text-gray-700">Pôle</label>
                        <select
                            id="pole"
                            value={data.pole}
                            onChange={e => setData('pole', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            aria-invalid={!!errors.pole}
                            aria-describedby={errors.pole ? "pole-error" : undefined}
                            required
                        >
                            <option value="" disabled>Sélectionnez un pôle</option>
                            <option value="assurance">Assurance</option>
                            <option value="telephonie">Téléphonie</option>
                            <option value="energie">Énergie</option>
                        </select>
                        {errors.pole && <p id="pole-error" className="mt-2 text-sm text-red-600">{errors.pole}</p>}
                    </div>

                    <fieldset>
                        <legend className="text-sm font-medium text-gray-700">Langues</legend>
                        <div className="mt-2 space-y-2">
                            {['fr', 'de', 'en'].map(lang => (
                                <div key={lang} className="flex items-center">
                                    <input
                                        id={`lang-${lang}`}
                                        type="checkbox"
                                        checked={data.languages.includes(lang)}
                                        onChange={() => handleLanguageChange(lang)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor={`lang-${lang}`} className="ml-2 block text-sm text-gray-900 uppercase">
                                        {lang}
                                    </label>
                                </div>
                            ))}
                        </div>
                        {errors.languages && <p className="mt-2 text-sm text-red-600" role="alert">{errors.languages}</p>}
                    </fieldset>
                </fieldset>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {processing ? 'Création en cours...' : 'Créer le cours'}
                    </button>
                </div>
            </form>
        </main>
    );
}