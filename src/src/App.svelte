<script>
	import WordInput from "./components/WordInput.svelte";
	import WordMeanings from "./components/WordMeanings.svelte";
</script>

<svelte:head>
	<style>
		body {
			max-width: 600px;
			max-height: 300px;
		}
	</style>
</svelte:head>
<main>
	<WordInput />
	<WordMeanings />
</main>

<style>
	main {
		position: absolute;
		width: 100%;
		height: 100%;
	}
</style>