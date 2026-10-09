<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\QuizScrapeRequest;
use App\Http\Requests\Admin\ImportQuizRequest;
use App\Models\Module;
use App\Services\QuizScraperService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class QuizImportController extends Controller
{
    public function __construct(
        private readonly QuizScraperService $scraperService
    ) {}

    public function show(Module $module)
    {
        return Inertia::render('admin/quizzes/import', [
            'module' => $module,
        ]);
    }

    public function preview(Module $module, QuizScrapeRequest $request)
    {
        $questions = [];

        if ($request->filled('url')) {
            $questions = $this->scraperService->scrapeFromUrl($request->input('url'));
        } elseif ($request->hasFile('file')) {
            $html = file_get_contents($request->file('file')->getRealPath());
            $questions = $this->scraperService->scrapeFromHtml($html);
        }

        $questionsData = array_map(fn($q) => $q->toArray(), $questions);

        return response()->json(['questions' => $questionsData]);
    }

    public function import(Module $module, ImportQuizRequest $request)
    {
        DB::transaction(function () use ($module, $request) {
            $quiz = $module->quiz()->firstOrCreate([
                'title' => 'Quiz for ' . $module->title,
            ]);

            foreach ($request->input('questions') as $questionData) {
                $question = $quiz->questions()->create([
                    'question_text' => $questionData['text'],
                ]);

                foreach ($questionData['answers'] as $answerData) {
                    $question->answers()->create([
                        'answer_text' => $answerData['text'],
                        'is_correct' => $answerData['isCorrect'],
                    ]);
                }
            }
        });

        return redirect()->route('admin.modules.show', $module)->with('success', 'Quiz imported successfully.');
    }
}
