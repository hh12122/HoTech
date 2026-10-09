<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('module_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->integer('sort_order')->default(0)->index();
            $table->string('video_provider')->nullable();
            $table->string('video_id')->nullable();
            $table->integer('duration_seconds')->default(0);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('lessons'); }
};
