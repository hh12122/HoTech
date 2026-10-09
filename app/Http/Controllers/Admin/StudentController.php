<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreStudentRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Auth\Events\Registered;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');

        $studentsQuery = User::where('role', 'learner')
            ->withCount('enrollments')
            ->orderBy('name');

        if ($search) {
            $studentsQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $students = $studentsQuery->paginate(10)->through(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'isActive' => $user->is_active,
                'lastLoginAt' => $user->last_login_at ? $user->last_login_at->format('Y-m-d H:i') : null,
                'enrolledCoursesCount' => $user->enrollments_count,
            ];
        });

        return Inertia::render('admin/students/index', [
            'students' => $students,
            'filters' => ['search' => $search],
        ]);
    }

    public function show(User $user)
    {
        $user->load('enrollments.course.modules.lessons');
        
        $enrollments = $user->enrollments->map(function ($enrollment) use ($user) {
            $totalLessons = $enrollment->course->modules->sum(function ($module) {
                return $module->lessons->count();
            });
            
            $completedLessons = \App\Models\LessonProgress::where('user_id', $user->id)
                ->whereHas('lesson.module', function ($q) use ($enrollment) {
                    $q->where('course_id', $enrollment->course_id);
                })
                ->where('completed', true)
                ->count();
                
            $completionRate = $totalLessons > 0 ? ($completedLessons / $totalLessons) * 100 : 0;

            return [
                'courseId' => $enrollment->course->id,
                'courseTitle' => $enrollment->course->title,
                'enrolledAt' => $enrollment->enrolled_at->format('Y-m-d'),
                'completionRate' => round($completionRate, 2),
            ];
        });

        return Inertia::render('admin/students/show', [
            'student' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'isActive' => $user->is_active,
                'lastLoginAt' => $user->last_login_at ? $user->last_login_at->format('Y-m-d H:i') : null,
                'enrollments' => $enrollments,
            ],
        ]);
    }

    public function store(StoreStudentRequest $request)
    {
        $tempPassword = Str::random(10);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($tempPassword),
            'role' => 'learner',
            'pole' => $request->pole,
            'is_active' => true,
        ]);

        event(new Registered($user));
        // In a real scenario we might send the temp password via email

        return redirect()->route('admin.students.index')->with('success', 'Learner created successfully. Temp password: ' . $tempPassword);
    }

    public function toggleActive(User $user)
    {
        $user->update([
            'is_active' => !$user->is_active,
        ]);

        return redirect()->back()->with('success', 'Learner status updated successfully.');
    }
}
