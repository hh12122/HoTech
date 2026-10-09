<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\QuizAttempt;
use App\Models\LessonProgress;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        $pole = $request->query('pole');

        // Total active students (e.g. users logged in last 30 days)
        $totalActiveStudents = User::where('last_login_at', '>=', now()->subDays(30))->count();

        // Global quiz pass rate
        $quizAttemptsQuery = QuizAttempt::query();
        if ($pole) {
            $quizAttemptsQuery->whereHas('quiz.module.course', function ($q) use ($pole) {
                $q->where('pole', $pole);
            });
        }
        $totalAttempts = $quizAttemptsQuery->count();
        $passedAttempts = (clone $quizAttemptsQuery)->where('passed', true)->count();
        $globalQuizPassRate = $totalAttempts > 0 ? ($passedAttempts / $totalAttempts) * 100 : 0;

        // Course metrics
        $coursesQuery = Course::withCount('enrollments');
        if ($pole) {
            $coursesQuery->where('pole', $pole);
        }
        $courses = $coursesQuery->get();

        $courseMetrics = [];
        $totalLessonsCompleted = 0;
        $totalLessonsPossible = 0;

        foreach ($courses as $course) {
            $enrolled = $course->enrollments_count;
            
            // To calculate completion, let's count completed lessons for enrolled students in this course vs total lessons in this course
            $totalLessonsInCourse = $course->modules()->withCount('lessons')->get()->sum('lessons_count');
            
            $completedLessonsForCourse = 0;
            if ($totalLessonsInCourse > 0 && $enrolled > 0) {
                $completedLessonsForCourse = LessonProgress::whereHas('lesson.module', function ($q) use ($course) {
                    $q->where('course_id', $course->id);
                })->where('completed', true)->count();

                $possible = $totalLessonsInCourse * $enrolled;
                $courseCompletionRate = $possible > 0 ? ($completedLessonsForCourse / $possible) * 100 : 0;
                $totalLessonsPossible += $possible;
                $totalLessonsCompleted += $completedLessonsForCourse;
            } else {
                $courseCompletionRate = 0;
            }

            $courseMetrics[] = [
                'courseTitle' => $course->title,
                'enrolledStudents' => $enrolled,
                'completionRate' => round($courseCompletionRate, 2),
            ];
        }

        $globalCompletionRate = $totalLessonsPossible > 0 ? ($totalLessonsCompleted / $totalLessonsPossible) * 100 : 0;

        // Monthly enrollments for the chart
        $monthlyEnrollments = Enrollment::select(
            DB::raw('strftime("%Y-%m", enrolled_at) as month'),
            DB::raw('COUNT(id) as count')
        )
        ->groupBy('month')
        ->orderBy('month', 'asc')
        ->take(12)
        ->get()
        ->map(function ($item) {
            return [
                'name' => $item->month,
                'students' => $item->count,
            ];
        })->toArray();

        return Inertia::render('admin/analytics/index', [
            'totalActiveStudents' => $totalActiveStudents,
            'globalCompletionRate' => round($globalCompletionRate, 2),
            'globalQuizPassRate' => round($globalQuizPassRate, 2),
            'courseMetrics' => $courseMetrics,
            'monthlyEnrollments' => $monthlyEnrollments,
            'pole' => $pole,
        ]);
    }
}
