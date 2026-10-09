import React, { memo } from 'react';
import { useForm, router } from '@inertiajs/react';

// DTO Interfaces
interface LessonEditData {
    id: number;
    title: string;
    sortOrder: number;
    hasVideo: boolean;
}

interface ModuleEditData {
    id: number;
    title: string;
    sortOrder: number;
    lessons: LessonEditData[];
}

interface CourseEditData {
    id: number;
    title: string;
    modules: ModuleEditData[];
}

interface EditCoursePageProps {
    course: CourseEditData;
}

// Subcomponents (Memoized)
const LessonItem = memo(({ lesson, moduleId }: { lesson: LessonEditData; moduleId: number }) => {
    return (
        <li className="flex items-center justify-between p-3 bg-white border rounded shadow-sm mb-2">
            <span>{lesson.title} {lesson.hasVideo && '📺'}</span>
            <div className="space-x-2">
                <button 
                    onClick={() => router.delete(`/admin/lessons/${lesson.id}`)}
                    className="text-red-500 hover:text-red-700 text-sm"
                >Supprimer</button>
            </div>
        </li>
    );
});
LessonItem.displayName = 'LessonItem';

const ModuleItem = memo(({ module }: { module: ModuleEditData }) => {
    const { data, setData, post, processing, errors } = useForm({ title: '' });

    const addLesson = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/admin/modules/${module.id}/lessons`, {
            onSuccess: () => setData('title', '')
        });
    };

    return (
        <div className="p-4 mb-4 bg-gray-50 border rounded shadow">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{module.title}</h2>
                <button 
                    onClick={() => router.delete(`/admin/modules/${module.id}`)}
                    className="text-red-500 hover:text-red-700 text-sm"
                >Supprimer Module</button>
            </div>
            
            <ul className="mb-4">
                {module.lessons.map(lesson => (
                    <LessonItem key={lesson.id} lesson={lesson} moduleId={module.id} />
                ))}
            </ul>

            <form onSubmit={addLesson} className="flex gap-2" noValidate>
                <input 
                    type="text" 
                    value={data.title} 
                    onChange={e => setData('title', e.target.value)}
                    placeholder="Nouvelle leçon..."
                    className="border p-2 rounded flex-1"
                    aria-invalid={!!errors.title}
                    aria-describedby={errors.title ? `lesson-err-${module.id}` : undefined}
                />
                <button type="submit" disabled={processing} className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50">
                    Ajouter Leçon
                </button>
                {errors.title && <span id={`lesson-err-${module.id}`} className="text-red-500 text-sm">{errors.title}</span>}
            </form>
        </div>
    );
});
ModuleItem.displayName = 'ModuleItem';

export default function EditCoursePage({ course }: EditCoursePageProps) {
    const { data, setData, post, processing, errors } = useForm({ title: '' });

    const addModule = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/admin/courses/${course.id}/modules`, {
            onSuccess: () => setData('title', '')
        });
    };

    return (
        <main className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Éditer: {course.title}</h1>
            
            <div className="space-y-4 mb-8">
                {course.modules.map(module => (
                    <ModuleItem key={module.id} module={module} />
                ))}
            </div>

            <form onSubmit={addModule} className="bg-white p-4 border rounded shadow" noValidate>
                <h3 className="text-lg font-semibold mb-2">Ajouter un Module</h3>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={data.title} 
                        onChange={e => setData('title', e.target.value)}
                        placeholder="Titre du module..."
                        className="border p-2 rounded flex-1"
                        aria-invalid={!!errors.title}
                        aria-describedby={errors.title ? "module-error" : undefined}
                    />
                    <button type="submit" disabled={processing} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">
                        Ajouter
                    </button>
                </div>
                {errors.title && <p id="module-error" className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </form>
        </main>
    );
}
