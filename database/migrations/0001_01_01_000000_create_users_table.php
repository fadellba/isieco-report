<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {

            $table->id();

            // Informations personnelles
            $table->string('nom');
            $table->string('prenom');

            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();

            $table->string('telephone', 20)->nullable();
            $table->string('adresse')->nullable();

            $table->string('password');

            // Gestion du compte
            $table->enum('etat_compte', [
                'actif',
                'inactif',
                'suspendu'
            ])->default('actif');

            $table->rememberToken();

            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {

            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();

        });

        Schema::create('sessions', function (Blueprint $table) {

            $table->string('id')->primary();

            $table->foreignId('user_id')
                ->nullable()
                ->index();

            $table->string('ip_address', 45)->nullable();

            $table->text('user_agent')->nullable();

            $table->longText('payload');

            $table->integer('last_activity')->index();

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
