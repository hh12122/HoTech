<?php
namespace App\Http\Controllers\Admin;

use App\DTOs\Admin\CourseFormData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCourseRequest;
use App\Http\Requests\Admin\UpdateCourseRequest;
use App\Models\Course;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class CourseController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('admin/courses/create', [
            'form' => CourseFormData::empty()
        ]);
    }

    public function store(StoreCourseRequest $request): RedirectResponse
    {
        $course = Course::create($request->validated());
        
        return redirect()->route('admin.courses.edit', $course->id)
            ->with('success', 'Course created successfully.');
    }

    public function edit(Course $course): Response
    {
        return Inertia::render('admin/courses/edit', [
            'course' => CourseFormData::fromModel($course) // Note: later updated to CourseEditData in UC-A02
        ]);
    }

    public function update(UpdateCourseRequest $request, Course $course): RedirectResponse
    {
        $course->update($request->validated());
        
        return redirect()->back()->with('success', 'Course updated successfully.');
    }
}
