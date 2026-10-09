<?php

use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';

use App\Http\Controllers\Admin\CourseController;

Route::middleware(['auth'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/courses/create', [CourseController::class, 'create'])->name('courses.create');
    Route::post('/courses', [CourseController::class, 'store'])->name('courses.store');
    Route::get('/courses/{course}/edit', [CourseController::class, 'edit'])->name('courses.edit');
    Route::put('/courses/{course}', [CourseController::class, 'update'])->name('courses.update');

    // UC-A06: Import Quiz via Scraping
    Route::get('/modules/{module}/quiz/import', [\App\Http\Controllers\Admin\QuizImportController::class, 'show'])->name('modules.quiz.import.show');
    Route::post('/modules/{module}/quiz/scrape', [\App\Http\Controllers\Admin\QuizImportController::class, 'preview'])->name('modules.quiz.scrape');
    Route::post('/modules/{module}/quiz/import', [\App\Http\Controllers\Admin\QuizImportController::class, 'import'])->name('modules.quiz.import');

    // UC-A07: Learner Analytics
    Route::get('/analytics', [\App\Http\Controllers\Admin\AnalyticsController::class, 'index'])->name('analytics.index');

    // UC-A08: Manage Learner Accounts
    Route::get('/students', [\App\Http\Controllers\Admin\StudentController::class, 'index'])->name('students.index');
    Route::get('/students/{user}', [\App\Http\Controllers\Admin\StudentController::class, 'show'])->name('students.show');
    Route::put('/students/{user}/toggle-active', [\App\Http\Controllers\Admin\StudentController::class, 'toggleActive'])->name('students.toggle-active');
    Route::post('/students', [\App\Http\Controllers\Admin\StudentController::class, 'store'])->name('students.store');

    // UC-A09: Quiz Pass Threshold Config
    Route::get('/quizzes/{quiz}/edit', [\App\Http\Controllers\Admin\QuizController::class, 'edit'])->name('quizzes.edit');
    Route::put('/quizzes/{quiz}', [\App\Http\Controllers\Admin\QuizController::class, 'update'])->name('quizzes.update');

    // UC-A10: Manage Certificate Templates
    Route::get('/certificate-templates', [\App\Http\Controllers\Admin\CertificateTemplateController::class, 'index'])->name('certificate-templates.index');
    Route::get('/certificate-templates/{template}/edit', [\App\Http\Controllers\Admin\CertificateTemplateController::class, 'edit'])->name('certificate-templates.edit');
    Route::put('/certificate-templates/{template}', [\App\Http\Controllers\Admin\CertificateTemplateController::class, 'update'])->name('certificate-templates.update');
    Route::get('/certificate-templates/{template}/preview', [\App\Http\Controllers\Admin\CertificateTemplateController::class, 'preview'])->name('certificate-templates.preview');
});
