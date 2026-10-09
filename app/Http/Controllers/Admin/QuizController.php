<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateQuizRequest;
use App\Models\Quiz;
use Illuminate\Http\Request;
use Inertia\Inertia;

class QuizController extends Controller
{
    public function edit(Quiz $quiz)
    {
        return Inertia::render('admin/quizzes/edit', [
            'quiz' => $quiz,
        ]);
    }

    public function update(UpdateQuizRequest $request, Quiz $quiz)
    {
        $quiz->update([
            'title' => $request->title,
            'pass_threshold' => $request->pass_threshold,
        ]);

        return redirect()->back()->with('success', 'Quiz updated successfully.');
    }
}
